/**
 * Comprehensive cache management for Safari self-healing.
 * Clears Browser Cache API, IndexedDB, localStorage, and sessionStorage.
 */

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BUILD_VERSION_KEY = 'app_build_version';
const RECOVERY_ATTEMPTS_KEY = 'app_recovery_attempts';
const RECOVERY_TIMESTAMP_KEY = 'app_recovery_last_ts';
const MAX_AUTO_RECOVERY_ATTEMPTS = 3;
// Minimum ms between recovery reloads to prevent tight loops
const MIN_RECOVERY_INTERVAL_MS = 60_000;

/**
 * Clear all browser Cache API entries (service worker caches, etc.)
 */
async function clearBrowserCacheAPI(): Promise<void> {
  if (!('caches' in window)) return;
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[CacheManager] Cleared browser Cache API:', cacheNames.length, 'caches');
  } catch (e) {
    console.warn('[CacheManager] Failed to clear Cache API:', e);
  }
}

/**
 * Delete IndexedDB databases that are NOT auth-related.
 * Auth databases must be preserved to keep users logged in across deploys.
 */
function clearNonAuthIndexedDB(): void {
  // Intentionally empty: we no longer delete any IndexedDB databases during
  // cache recovery. The only IDB database we use ('supabase-auth-storage')
  // stores auth tokens and must survive across deploys.
  console.log('[CacheManager] Skipping IndexedDB clear (preserving auth)');
}

/**
 * Clear specific localStorage keys that are known to cause issues,
 * but PRESERVE Supabase auth tokens so users stay logged in.
 */
function clearNonAuthLocalStorageKeys(): void {
  const riskyKeys = [
    'shopify-cart',
    'admin_session_backup',
    'zustand',
  ];

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // NEVER remove auth tokens — these keep users logged in
      if (key.startsWith('sb-') && (key.includes('auth-token') || key.includes('refresh-token') || key.includes('provider-token'))) {
        continue;
      }
      
      if (riskyKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
        console.log(`[CacheManager] Removed localStorage: ${key}`);
      } catch {
        // Ignore
      }
    }
  } catch (e) {
    console.warn('[CacheManager] Error clearing localStorage:', e);
  }
}

/**
 * Clear sessionStorage
 */
function clearSessionStorage(): void {
  try {
    // Keep the refresh flag to prevent infinite loops
    const refreshFlag = sessionStorage.getItem('__app_forced_refresh__');
    sessionStorage.clear();
    if (refreshFlag) {
      sessionStorage.setItem('__app_forced_refresh__', refreshFlag);
    }
    console.log('[CacheManager] Cleared sessionStorage');
  } catch (e) {
    console.warn('[CacheManager] Error clearing sessionStorage:', e);
  }
}

/**
 * Perform comprehensive cache clearing
 */
export async function clearAllCaches(): Promise<void> {
  console.log('[CacheManager] Starting comprehensive cache clear...');
  
  await clearBrowserCacheAPI();
  clearNonAuthIndexedDB();
  clearNonAuthLocalStorageKeys();
  clearSessionStorage();
  
  console.log('[CacheManager] Cache clear complete (auth preserved)');
}

/**
 * Get the current build version from the environment
 */
export function getCurrentBuildVersion(): string {
  return import.meta.env.VITE_BUILD_VERSION || 'dev';
}

/**
 * Get the stored build version from localStorage
 */
export function getStoredBuildVersion(): string | null {
  try {
    return localStorage.getItem(BUILD_VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the current build version
 */
export function storeBuildVersion(version: string): void {
  try {
    localStorage.setItem(BUILD_VERSION_KEY, version);
  } catch {
    // Ignore
  }
}

/**
 * Get the number of recovery attempts
 */
export function getRecoveryAttempts(): number {
  try {
    // Use localStorage (not sessionStorage) so the counter survives
    // Safari's sessionStorage clearing on location.replace navigations.
    const attempts = localStorage.getItem(RECOVERY_ATTEMPTS_KEY);
    return attempts ? parseInt(attempts, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Increment recovery attempts counter
 */
export function incrementRecoveryAttempts(): number {
  try {
    const current = getRecoveryAttempts();
    const next = current + 1;
    localStorage.setItem(RECOVERY_ATTEMPTS_KEY, String(next));
    localStorage.setItem(RECOVERY_TIMESTAMP_KEY, String(Date.now()));
    return next;
  } catch {
    return 0;
  }
}

/**
 * Reset recovery attempts counter
 */
export function resetRecoveryAttempts(): void {
  try {
    localStorage.removeItem(RECOVERY_ATTEMPTS_KEY);
    localStorage.removeItem(RECOVERY_TIMESTAMP_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Check if we've exceeded max auto-recovery attempts
 */
export function hasExceededRecoveryAttempts(): boolean {
  // Only show the banner after genuinely exhausting all auto-recovery attempts.
  // The timestamp guard is used separately in shouldThrottleRecovery().
  return getRecoveryAttempts() >= MAX_AUTO_RECOVERY_ATTEMPTS;
}

/**
 * Returns true if a recovery reload happened too recently.
 * Used ONLY to throttle automatic reloads — NOT to show the banner.
 */
export function shouldThrottleRecovery(): boolean {
  try {
    const lastTs = localStorage.getItem(RECOVERY_TIMESTAMP_KEY);
    if (lastTs) {
      const elapsed = Date.now() - parseInt(lastTs, 10);
      if (elapsed < MIN_RECOVERY_INTERVAL_MS) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Force a cache-busting reload
 */
export function forceCacheBustingReload(reason: string): void {
  try {
    // Guard against tight reload loops (e.g. bfcache restoring a broken page repeatedly)
    const loopKey = '__cache_bust_reload__';
    const lastReload = sessionStorage.getItem(loopKey);
    if (lastReload && Date.now() - parseInt(lastReload, 10) < 5_000) {
      console.warn('[CacheManager] Reload loop detected, aborting');
      return;
    }
    sessionStorage.setItem(loopKey, String(Date.now()));
  } catch {
    // sessionStorage may be unavailable; proceed anyway
  }

  try {
    // Prefer location.reload() — Safari is more likely to bypass its cache
    // with a full reload than with location.replace() + query params.
    window.location.reload();
  } catch {
    try {
      // Fallback: navigate with cache-busting query param
      const url = new URL(window.location.href);
      url.searchParams.set('__refresh', String(Date.now()));
      url.searchParams.set('__reason', reason);
      window.location.replace(url.toString());
    } catch {
      // Give up
    }
  }
}

/**
 * Check if build version changed and needs recovery
 */
export function checkBuildVersionMismatch(): boolean {
  const current = getCurrentBuildVersion();
  const stored = getStoredBuildVersion();
  
  // No stored version = first visit, no mismatch
  if (!stored) {
    storeBuildVersion(current);
    return false;
  }
  
  // Version matches = no mismatch
  if (stored === current) {
    return false;
  }
  
  console.log(`[CacheManager] Build version mismatch: stored=${stored}, current=${current}`);
  return true;
}

/**
 * Perform proactive recovery when build version changes
 */
export async function performProactiveRecovery(): Promise<void> {
  console.log('[CacheManager] Performing proactive recovery for new build...');
  
  const attempts = incrementRecoveryAttempts();
  console.log(`[CacheManager] Recovery attempt ${attempts}`);
  
  await clearAllCaches();
  
  // Update stored version
  storeBuildVersion(getCurrentBuildVersion());
  
  // Force reload with cache busting
  forceCacheBustingReload('build_version_change');
}
