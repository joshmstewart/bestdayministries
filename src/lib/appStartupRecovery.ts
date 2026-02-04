// Startup recovery utilities for browsers (notably Safari) that can get into a bad
// cached/storage state requiring users to "Clear site data".
//
// Goals:
// 1) Never crash during startup due to corrupted localStorage JSON.
// 2) Auto-recover from common stale-cache chunk/module load failures by forcing a
//    one-time cache-busting reload.
// 3) Proactively clear caches when a new build version is detected.
// 4) Show recovery UI if automatic recovery fails after multiple attempts.

import {
  checkBuildVersionMismatch,
  performProactiveRecovery,
  clearAllCaches,
  incrementRecoveryAttempts,
  hasExceededRecoveryAttempts,
  forceCacheBustingReload,
} from './cacheManager';

const STORAGE_VERSION_KEY = "app_storage_version";

// Bump this when we change how we persist things in localStorage.
// When it changes, we clear a small set of known keys to avoid Safari getting stuck.
const APP_STORAGE_VERSION = 1;

function safeLocalStorageAvailable(): boolean {
  try {
    const k = "__storage_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function safeParseJson(raw: string): unknown {
  return JSON.parse(raw);
}

function getSupabaseStorageKeyPrefix(): string | null {
  // Vite exposes this in the browser build.
  const projectId = (import.meta as any)?.env?.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (!projectId) return null;
  return `sb-${projectId}-`;
}

function getAllLocalStorageKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  } catch {
    return [];
  }
}

function clearKnownKeys() {
  // Keep this list small and targeted.
  // - 'shopify-cart' is JSON persisted via zustand; corruption can crash startup.
  // - Supabase auth token is JSON; corruption can break auth init.
  // - Admin session backup is used during admin flows.
  safeRemove("shopify-cart");
  safeRemove("admin_session_backup");

  const prefix = getSupabaseStorageKeyPrefix();
  if (prefix) {
    for (const key of getAllLocalStorageKeys()) {
      if (key.startsWith(prefix)) {
        // Only remove auth-related values; keep other keys if any.
        if (key.includes("auth-token") || key.includes("refresh-token") || key.includes("provider-token")) {
          safeRemove(key);
        }
      }
    }
  }
}

function validateJsonKey(key: string) {
  const raw = safeGet(key);
  if (!raw) return;
  try {
    safeParseJson(raw);
  } catch {
    // Corrupted JSON - removing it is safer than crashing the app.
    safeRemove(key);
  }
}

function validateSupabaseAuthJsonKeys() {
  const prefix = getSupabaseStorageKeyPrefix();
  if (!prefix) return;

  const keys = getAllLocalStorageKeys();
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    if (key.includes("auth-token")) {
      validateJsonKey(key);
    }
  }
}

export function sanitizeBrowserStorageForStartup() {
  if (typeof window === "undefined") return;
  if (!safeLocalStorageAvailable()) return;

  try {
    const current = safeGet(STORAGE_VERSION_KEY);

    // If the version changed (or isn't set), clear known risky keys once.
    if (current !== String(APP_STORAGE_VERSION)) {
      clearKnownKeys();
      safeSet(STORAGE_VERSION_KEY, String(APP_STORAGE_VERSION));
    }

    // Always validate the most crash-prone JSON keys.
    validateJsonKey("shopify-cart");
    validateSupabaseAuthJsonKeys();
  } catch {
    // If anything goes wrong, do nothing - never block startup.
  }
}

function shouldForceRefreshFromError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("chunkloaderror") ||
    m.includes("loading chunk") ||
    m.includes("importing a module script failed") ||
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("unexpected token") ||
    m.includes("syntax error")
  );
}

async function handleChunkLoadError(reason: string) {
  console.log('[Recovery] Chunk load error detected:', reason);
  
  // Check if we've already exceeded max attempts
  if (hasExceededRecoveryAttempts()) {
    console.log('[Recovery] Max attempts exceeded, showing recovery banner');
    // Don't reload - let the banner show
    return;
  }
  
  // Increment attempt counter
  const attempts = incrementRecoveryAttempts();
  console.log(`[Recovery] Attempt ${attempts} - clearing caches`);
  
  // Clear all caches
  await clearAllCaches();
  
  // Force reload
  forceCacheBustingReload(reason);
}

/**
 * Check for build version mismatch and perform proactive recovery
 * This runs early in the startup process
 */
export async function checkAndRecoverFromBuildMismatch(): Promise<void> {
  if (typeof window === "undefined") return;
  
  try {
    // Check if we've exceeded recovery attempts - don't loop
    if (hasExceededRecoveryAttempts()) {
      console.log('[Recovery] Recovery attempts exceeded, waiting for user action');
      return;
    }
    
    // Check for build version mismatch
    if (checkBuildVersionMismatch()) {
      await performProactiveRecovery();
      // This function will trigger a reload, so we won't reach here
    }
  } catch (e) {
    console.warn('[Recovery] Error during build version check:', e);
    // Don't block startup
  }
}

export function installStartupRecoveryListeners() {
  if (typeof window === "undefined") return;

  window.addEventListener(
    "error",
    (e) => {
      const msg = (e as ErrorEvent)?.message || "";
      if (msg && shouldForceRefreshFromError(msg)) {
        handleChunkLoadError("script_error");
      }
    },
    true
  );

  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent)?.reason;
    const msg =
      typeof reason === "string"
        ? reason
        : (reason && typeof reason.message === "string" ? reason.message : "");

    if (msg && shouldForceRefreshFromError(msg)) {
      handleChunkLoadError("unhandled_rejection");
    }
  });
}
