

# Fix: Chaotic Page Load / Logout / Recovery Loop

## Problem Summary
When you load the page, multiple competing systems fight with each other, causing reloads, flashing banners, and delayed login. The root causes are:

1. **Unnecessary build-version reloads** -- the system thinks every deploy is a "mismatch" because no build version is actually set, so it clears caches and reloads on nearly every visit
2. **Too-aggressive auth watchdog** -- a 7-second timer reloads the page if auth takes too long, but the dual-client validation (4 network calls) regularly takes longer than that on slower connections
3. **Auth event storm** -- mirroring sessions between two clients fires auth change events that cascade into redundant processing
4. **Stale recovery counter** -- old recovery attempts accumulate and eventually show the "Fix Now" banner even when nothing is wrong

## Plan

### 1. Disable the build-version reload loop
The `VITE_BUILD_VERSION` env var is never set, so it always returns `'dev'`. This means the mismatch check either always or never fires depending on timing. Remove the `checkAndRecoverFromBuildMismatch()` call from `main.tsx` entirely -- it was designed for a scenario that doesn't apply and is currently just causing unnecessary reloads.

**Files:** `src/main.tsx`

### 2. Increase the auth watchdog timeout (or remove it)
The 7-second watchdog in `AuthContext` fires `clearAllCaches + forceCacheBustingReload` if auth init hasn't completed. But the reconciliation does 4 sequential network calls (2x `getSession`, 2x `getUser`) plus potential mirroring -- this can easily take 7+ seconds on mobile or slow connections. Increase the timeout to 15 seconds, and add a check so the watchdog only fires if the page is visually broken (no session AND no content rendered), not just "slow."

**Files:** `src/contexts/AuthContext.tsx`

### 3. Reduce auth init from 4 network calls to 2
Currently reconciliation calls `getSession()` on both clients, then `getUser()` on both. Since the persistent client is the source of truth, we can skip validating the standard client's session independently -- just validate the persistent session, and if valid, mirror it. This cuts 2 network calls from every page load.

**Files:** `src/contexts/AuthContext.tsx`

### 4. Debounce auth state change handlers
Add a short debounce (200ms) to the `onAuthStateChange` handlers so that the rapid-fire events from session mirroring collapse into a single state update instead of 4-5 sequential processing attempts.

**Files:** `src/contexts/AuthContext.tsx`

### 5. Auto-reset recovery counter on successful load
After auth completes successfully (user is logged in, profile loaded), automatically call `resetRecoveryAttempts()`. This prevents stale counters from accumulating across sessions and eventually showing the "Fix Now" banner when nothing is wrong.

**Files:** `src/contexts/AuthContext.tsx`, import `resetRecoveryAttempts` from cacheManager

### Technical Details

**Current page load sequence (broken):**
```text
main.tsx
  -> sanitizeBrowserStorageForStartup()     (clears risky keys)
  -> checkAndRecoverFromBuildMismatch()      (RELOAD #1 if version != stored)
  -> React mounts -> AuthProvider
    -> reconcileAuthSessions()               (4 network calls, 3-10s)
    -> 7s watchdog fires if still loading    (RELOAD #2)
    -> onAuthStateChange fires 4-5x          (event storm)
    -> if 3 reloads accumulated -> "Fix Now" banner blocks page
```

**After fix:**
```text
main.tsx
  -> sanitizeBrowserStorageForStartup()     (unchanged)
  -> React mounts -> AuthProvider
    -> simplified reconciliation             (2 network calls, 1-4s)
    -> 15s watchdog (safety net only)
    -> debounced auth change handler         (1 state update)
    -> resetRecoveryAttempts() on success    (clears counter)
```

**Expected result:** Page loads once, auth resolves in 1-4 seconds, no reloads, no banners, no event storms.

