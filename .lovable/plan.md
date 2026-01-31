
PRE-CHANGE CHECKLIST:
□ Searched docs for: terms_acceptance, TermsAcceptanceGuard, record-terms-acceptance, picture login, auth sync
□ Read files: src/components/TermsAcceptanceGuard.tsx, src/hooks/useTermsCheck.ts, src/components/TermsAcceptanceDialog.tsx, src/contexts/AuthContext.tsx, src/pages/Auth.tsx, src/components/auth/PicturePasswordLogin.tsx, supabase/functions/record-terms-acceptance/index.ts, docs/TERMS_PRIVACY_SYSTEM.md
□ Searched code for: /auth/picture, signInWithPassword, supabasePersistent, checkAndRedirect, record-terms-acceptance
□ Found patterns: yes — app uses two auth clients (localStorage + IndexedDB) and a guard that checks `terms_acceptance` on every route
□ Ready: yes

## What happened (root cause, backed by evidence)
1) **Terms modal is allowed to appear on `/auth/picture`**
   - `TermsAcceptanceGuard.tsx` treats only `['/auth', '/auth/vendor', '/terms', '/privacy', '/', '/newsletter']` as public.
   - Your current route is `/auth/picture`, so the guard can show the modal there. This is a direct bug in the public-page check.

2) **The app is sometimes checking Terms acceptance while effectively “logged out” on the client that performs the query**
   - `useTermsCheck.ts` queries `terms_acceptance` using the *standard* client (`supabase` = localStorage).
   - But your network logs show those requests are going out with the **anon token** (not the user access token), so RLS returns **empty arrays** (e.g. profiles/user_roles returning `[]`), which makes `useTermsCheck` think you haven’t accepted.
   - This matches your behavior: “I already accepted forever ago” but it doesn’t recognize it.

3) **Auth sync is currently unstable because the “stored session” is invalid**
   - Your network logs show `/auth/v1/user` returning `403 session_not_found` with message: “Session from session_id claim in JWT does not exist”.
   - Your console logs show `AuthSessionMissingError: Auth session missing!` while trying to mirror to the standard client.
   - That means at least one storage has an **old/invalid token** cached; `getSession()` can still return it, but the server rejects it when the client tries to validate it. This causes the app to behave inconsistently (appears “signed in” in one place, “signed out” in another), which triggers the Terms loop and “login success but I’m still on /auth”.

## Goals
- If a user has already accepted Terms/Privacy in `terms_acceptance`, **they should never see the modal again** (unless versions are bumped).
- Picture login should behave the same as email/password login.
- Auth state should be single-source-of-truth, and session storage must self-heal if it contains invalid tokens.

---

## Implementation plan (in order)

### Phase 0 — Stop the bleeding (prevents modal from blocking login flows)
1) **Update `TermsAcceptanceGuard` public-route logic**
   - Replace exact-match `publicPages.includes(location.pathname)` with a robust check:
     - treat *all* `/auth` routes as public, e.g. `location.pathname.startsWith('/auth')`
     - keep `/terms`, `/privacy`, `/`, `/newsletter` as public
   - Outcome: Terms modal will not pop up on `/auth`, `/auth/vendor`, `/auth/picture`, etc. This prevents the modal from breaking the login screen.

### Phase 1 — Ensure Terms checks always use an authenticated client (fixes “I already accepted but it doesn’t see it”)
2) **Standardize Terms reads/writes onto the same auth client**
   - Update `useTermsCheck.ts` to use `supabasePersistent` for:
     - selecting from `terms_acceptance`
     - invoking `record-terms-acceptance`
   - Update `TermsAcceptanceDialog.tsx` to use `supabasePersistent.functions.invoke(...)` as well.
   - Add small guardrails:
     - if there is no valid session yet, don’t run the terms query (stay loading until auth resolves).
   - Why this works: your email/password login already uses `supabasePersistent`, and the issue is that the standard client frequently isn’t authenticated when Terms checks run.

3) **Defense-in-depth check**
   - In `useTermsCheck`, explicitly check `supabasePersistent.auth.getUser()` before querying terms; if it fails or returns null, treat as “auth not ready” rather than “needs acceptance”.
   - This avoids false “needs acceptance” when auth is momentarily unavailable.

### Phase 2 — Fix the underlying auth-sync instability (fixes stuck-on-/auth and wrong-user/session weirdness)
4) **Make auth reconciliation validate sessions, not just compare expiries**
   - In `AuthContext.tsx`, modify `reconcileAuthSessions()` so it:
     1. Reads both sessions.
     2. Validates each candidate by calling `client.auth.getUser()`:
        - If it returns `session_not_found` (or similar), treat that session as invalid.
     3. If a session is invalid, **clear it locally without calling logout endpoints**:
        - remove the auth token from localStorage for the standard client
        - remove the auth token from IndexedDB for the persistent client (via the existing `idbAuthStorage.removeItem(storageKey)`).
     4. After validation, pick the “winner” only among valid sessions.

5) **Prefer the most recent auth event session (not the longest expiry)**
   - Update `onAuthStateChange` handlers in `AuthContext.tsx` to pass through the `session` argument from the event.
   - If an auth event is `SIGNED_IN` and provides a session, treat it as authoritative and mirror it to the other client immediately.
   - This prevents an old session with a later `expires_at` from “winning” and bringing back the wrong user.

6) **Reduce reliance on the standard client for auth-driven app behavior**
   - Current `Auth.tsx` redirects based on `supabase.auth.getSession()` and listens to `supabase.auth.onAuthStateChange(...)` (standard client), but the actual login uses `supabasePersistent.auth.signInWithPassword(...)`.
   - Refactor `Auth.tsx` to use `useAuth()` context to detect “already signed in” and redirect, rather than listening to the wrong client.
   - Also ensure the profile query in `checkAndRedirect()` uses `supabasePersistent.from('profiles')...` (or uses a helper that selects the authenticated client).
   - Outcome: “login successful but still on /auth” stops happening.

### Phase 3 — Align picture login behavior with normal login
7) **Make picture login redirect use the same redirect logic**
   - Extract a shared redirect helper used by both:
     - email/password login
     - picture login
   - That helper should:
     - look up `profiles.default_homepage` using the authenticated client
     - navigate accordingly (vendor dashboard vs community)
   - Keep the existing `navigate(...)` call in `PicturePasswordLogin.tsx`, but call the shared redirect helper instead of hardcoding `/community`.

### Phase 4 — Add visibility so we can confirm it’s fixed (and catch regressions)
8) **Add targeted debug logging (temporary)**
   - In `AuthContext.tsx`, log (no secrets) when:
     - a session is found in either storage
     - a session is invalidated (session_not_found)
     - a session is mirrored successfully
   - In `useTermsCheck.ts`, log which client is being used and whether `getUser()` succeeded.
   - These logs help confirm we’re no longer querying `terms_acceptance` with anon auth.

9) **Update documentation**
   - Update:
     - `docs/TERMS_PRIVACY_SYSTEM.md` (public routes include `/auth/*`; terms checks must run with authenticated client)
     - `docs/AUTH_SYSTEM_CONCISE.md` (validation + storage-clearing for invalid sessions; do not base precedence solely on expires_at)
     - `docs/MASTER_SYSTEM_DOCS.md` (brief cross-reference: dual-client auth + terms guard interactions)

---

## Acceptance criteria / test checklist (must pass before we consider it fixed)
1) Desktop:
   - Log in as “Test Supporter” (email/password) → redirects off `/auth` → no Terms modal.
   - Log out → log in as Joshie S → no Terms modal.
2) Picture login:
   - Go to `/auth/picture` → Terms modal does not appear on the auth screen.
   - Enter correct picture sequence → redirects to the same destination logic as email/password (based on homepage setting) → no Terms modal for users who already accepted.
3) Regression:
   - Manually bump versions in code (later) → only then should the modal appear again for previously accepted users.
4) Network sanity:
   - After login, requests to `profiles`, `user_roles`, and `terms_acceptance` must be authenticated (not anon), and `/auth/v1/user` should not return `session_not_found`.

---

## Notes / risks
- The “session_not_found” responses indicate stored tokens that look valid locally but are invalid server-side. Clearing storage entries locally (without calling logout endpoints) is the safest way to self-heal without re-triggering the earlier “fresh session got invalidated” problem.
- The terms system is currently correct in the database (I verified both **Joshie S** and **Test Supporter** have `terms_acceptance` records for 1.0/1.0). The issue is entirely on the client side: the check is often performed without an authenticated session, so RLS hides the acceptance row.

