

# Fix Safari Desktop Infinite Loading

## Problem

Safari desktop gets stuck in an infinite loading state -- not just after updates, but on regular visits (like this morning with no changes). This means **any user on Safari** can hit this, and most will just give up.

The root causes are:

1. **The build-version recovery check exists but is never called.** The function `checkAndRecoverFromBuildMismatch()` was built but never wired into `main.tsx`, so stale cached JavaScript is never proactively cleared.

2. **Safari's back-forward cache (bfcache) resurrects dead page states.** When Safari restores a page from bfcache, the app can resume in a broken/stuck state with no mechanism to detect and reload.

3. **The dual-client auth reconciliation can hang on Safari.** IndexedDB operations have individual 1.5-second timeouts, but the overall `reconcileAuthSessions()` chains multiple IDB calls sequentially. If Safari's IndexedDB is sluggish (common after sleep/wake or tab restoration), the total time can exceed the 15-second watchdog -- or worse, the watchdog fires but the reload serves the same stuck page from cache.

4. **Cache-busting reload doesn't actually bust Safari's cache.** The current `forceCacheBustingReload` uses `location.replace()` with a query param, but Safari can still serve the HTML from disk cache.

## Solution (3 parts)

### Part 1: Activate the Build Version Check
Call `checkAndRecoverFromBuildMismatch()` in `main.tsx` before rendering. This proactively clears stale caches on the first visit after any deploy, preventing chunk load failures before they happen.

### Part 2: Add bfcache Detection
Add a `pageshow` event listener in `main.tsx` that detects when Safari restores a page from its back-forward cache (`event.persisted === true`) and forces a fresh reload. This is a standard, well-known fix for Safari.

### Part 3: Improve Cache-Busting Reload
Update `forceCacheBustingReload` in `cacheManager.ts` to use a more aggressive strategy: attempt `location.reload()` first (which is more likely to bypass Safari's cache than `location.replace()` with a query param), and set a sessionStorage flag to detect bfcache loops.

## Technical Details

### File: `src/main.tsx`
- Import and call `checkAndRecoverFromBuildMismatch()` before `createRoot`
- Add `pageshow` event listener for bfcache detection:
```typescript
window.addEventListener('pageshow', (event) => {
  if ((event as PageTransitionEvent).persisted) {
    window.location.reload();
  }
});
```

### File: `src/lib/cacheManager.ts`
- Update `forceCacheBustingReload` to prefer `window.location.reload()` over `location.replace()` with query params
- Add a sessionStorage guard to prevent tight reload loops from bfcache restoration

### File: `src/lib/appStartupRecovery.ts`
- No changes needed -- the exported function already works correctly

## Impact

- **Normal visits (no issues):** Zero impact -- version matches, no reload
- **First visit after a deploy:** One automatic ~1-2 second reload to load fresh assets
- **bfcache restoration:** Transparent reload to a fresh state
- **Auth stays preserved:** Cache clearing already preserves auth tokens
- **Other browsers:** No effect -- bfcache behavior is Safari-specific, and version checks are harmless everywhere

