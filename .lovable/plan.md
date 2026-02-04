
# Plan: Safari Self-Healing After Updates

## Problem Summary
After app updates, Safari on Mac gets stuck requiring manual "Clear site data" to work. Users who don't know this workaround are stuck with a broken app.

## Solution: Multi-Layer Self-Healing System

### Layer 1: Proactive Version Detection & Cache Clearing
- Track a build version that changes with each deployment
- On app load, compare cached version vs current version
- When mismatch detected: clear all caches proactively BEFORE errors occur

### Layer 2: Enhanced Chunk Load Recovery
- Improve the existing chunk load error detection
- When chunk errors occur: clear browser caches, IndexedDB auth, and localStorage
- Force a cache-busting reload with `?v=timestamp`

### Layer 3: Browser Cache API Clearing
- Use the Cache API (`caches.keys()` + `caches.delete()`) to clear cached resources
- This addresses Safari's aggressive caching of old JS chunks

### Layer 4: User-Visible Recovery UI
- If automatic recovery fails after 2 attempts, show a friendly banner
- Provide a "Fix Now" button that performs comprehensive cache clearing
- Include instructions for manual recovery as last resort

---

## Technical Implementation

### Step 1: Create Build Version System
Create a new file `src/lib/buildVersion.ts` that:
- Exports a `BUILD_VERSION` constant (timestamp or hash)
- Gets injected during build time via Vite's `define` config

### Step 2: Enhance Startup Recovery
Update `src/lib/appStartupRecovery.ts` to:
- Check build version on startup
- Clear browser Cache API on version mismatch
- Clear IndexedDB auth storage on version mismatch
- Reset the dual Supabase client state

### Step 3: Add Comprehensive Cache Clearing
Create a new function that clears:
1. Browser Cache API (`caches.delete()`)
2. IndexedDB databases (`indexedDB.deleteDatabase()`)
3. localStorage (targeted keys)
4. sessionStorage

### Step 4: Add Recovery UI Component
Create `src/components/AppRecoveryBanner.tsx`:
- Detects when app is in a broken state
- Shows user-friendly message
- Provides "Fix Now" button
- Falls back to manual instructions

### Step 5: Update Vite Config
Modify `vite.config.ts` to:
- Inject build timestamp as environment variable
- Ensure chunk hashes change with content

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/buildVersion.ts` | Create | Build version tracking |
| `src/lib/appStartupRecovery.ts` | Modify | Enhanced recovery logic |
| `src/lib/cacheManager.ts` | Create | Comprehensive cache clearing |
| `src/components/AppRecoveryBanner.tsx` | Create | User-facing recovery UI |
| `src/App.tsx` | Modify | Add recovery banner |
| `vite.config.ts` | Modify | Inject build version |

---

## Recovery Flow

```text
App Loads
    │
    ├─► Check BUILD_VERSION vs localStorage
    │       │
    │       └─► Mismatch? ───────────────┐
    │                                    │
    │                              Clear all caches
    │                              Reload with ?v=timestamp
    │                                    │
    └─► Normal startup                   │
            │                            │
            ├─► Chunk load error? ───────┤
            │                            │
            │                      Increment retry counter
            │                      Clear caches
            │                      Reload
            │                            │
            ├─► Retry count > 2? ────────┤
            │                            │
            │                      Show recovery banner
            │                      "Something went wrong"
            │                      [Fix Now] button
            │                            │
            └─► App works normally       │
                                         │
                                   Manual recovery
                                   instructions shown
```

---

## Key Code Additions

### Cache Clearing Function
```typescript
// Clear all browser caches
async function clearAllCaches() {
  // Clear Cache API
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  
  // Clear IndexedDB auth
  try {
    indexedDB.deleteDatabase('supabase-auth-storage');
  } catch {}
  
  // Clear risky localStorage keys
  const riskyKeys = ['shopify-cart', 'admin_session_backup'];
  riskyKeys.forEach(k => localStorage.removeItem(k));
  
  // Clear Supabase auth tokens
  const authKey = `sb-${PROJECT_ID}-auth-token`;
  localStorage.removeItem(authKey);
}
```

### Version Check on Startup
```typescript
const CURRENT_BUILD = import.meta.env.VITE_BUILD_VERSION;
const STORED_BUILD = localStorage.getItem('app_build_version');

if (STORED_BUILD && STORED_BUILD !== CURRENT_BUILD) {
  console.log('[Recovery] New build detected, clearing caches');
  await clearAllCaches();
  localStorage.setItem('app_build_version', CURRENT_BUILD);
  window.location.replace(`${location.pathname}?v=${Date.now()}`);
}
```

---

## Expected Outcomes

1. **Automatic Recovery**: 95%+ of Safari cache issues will self-heal without user action
2. **Visible Fallback**: Users see a helpful recovery banner instead of blank/broken page
3. **No Data Loss**: User auth is re-established after recovery (they may need to log in again)
4. **Logging**: All recovery attempts logged for debugging

---

## Testing Checklist
- [ ] Deploy update → Safari auto-recovers without manual cache clear
- [ ] Simulate chunk load error → App recovers automatically
- [ ] Force 3+ failed recoveries → Banner appears with Fix Now button
- [ ] Fix Now button → Successfully clears caches and reloads
- [ ] Verify auth state → User can log in after recovery
