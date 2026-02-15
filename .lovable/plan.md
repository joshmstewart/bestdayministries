

## Fix Two Remaining Security Issues (Safe, Non-Breaking)

These two fixes follow the Security Change Protocol and are designed to be additive-only -- no existing queries or access patterns will change.

---

### Issue 1: Add Auth Verification to `moderate-image` and `moderate-content`

**Current situation:**
- Both functions have `verify_jwt = true` in `config.toml`, meaning the Supabase gateway already rejects unauthenticated calls before the function code even runs
- However, the function code itself never inspects the JWT, so it cannot: log which user made the request, apply per-user rate limiting, or include user context in audit logs
- This is a low-risk gap but easy to close

**What changes:**

| File | Change |
|------|--------|
| `supabase/functions/moderate-image/index.ts` | Add `getClaims()` auth check at top of handler; pass `userId` to logs |
| `supabase/functions/moderate-content/index.ts` | Add `getClaims()` auth check at top of handler; pass `userId` to `logAiUsage` |
| `supabase/config.toml` | Change both to `verify_jwt = false` (validate in code instead, per project standard) |

**Consumer audit (no breaking changes):**
- `Discussions.tsx` -- calls via `supabase.functions.invoke()` which auto-sends auth token -- no change needed
- `PrayerRequestDialog.tsx` -- same pattern -- no change needed
- `GuardianSponsorMessenger.tsx` -- same pattern -- no change needed
- All callers already pass valid auth tokens since users must be logged in to post content

**Auth pattern (matches project standard from other edge functions):**
```text
1. Read Authorization header
2. getClaims(token) to validate JWT
3. Extract userId from claims.sub
4. Pass userId to logging
5. Return 401 if invalid
```

**Risk: NONE** -- All callers already send auth tokens. Adding server-side validation only rejects invalid tokens (which the gateway already blocks).

---

### Issue 2: Mark Funding Progress View Finding as Properly Handled

**Current situation:**
- The security finding says the `sponsor_bestie_funding_progress` view "exposes test mode data"
- In reality, the project already has a `sponsor_bestie_funding_progress_by_mode` view that includes `stripe_mode` as a column
- All 3 frontend consumers already filter appropriately:
  - `SponsorBestieDisplay.tsx` hardcodes `.eq('stripe_mode', 'live')` for public display
  - `SponsorBestie.tsx` filters by `currentMode` (admin-controlled setting)
  - `GuardianLinks.tsx` filters by sponsor bestie IDs and uses the mode-aware view
- The base `sponsor_bestie_funding_progress` view exists for the database RPC function but is not directly queried by frontend code

**Action:** Update the security finding to document that this is already properly handled. No code or database changes needed -- changing the view would risk breaking the RPC function (`get_sponsor_bestie_funding_progress`) that 3 frontend components depend on.

---

### Summary

| Issue | Action | Risk | Files Changed |
|-------|--------|------|---------------|
| moderate-image no auth | Add `getClaims()` validation + logging | None (additive only) | 1 edge function + config.toml |
| moderate-content no auth | Add `getClaims()` validation + logging | None (additive only) | 1 edge function + config.toml |
| Funding progress view | Update security finding metadata (no code change) | None | 0 files |

