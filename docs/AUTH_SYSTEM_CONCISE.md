AUTH SYSTEM - CONCISE

## Overview
Authentication system (`/auth`) with signup/login, role assignment, terms acceptance, and vendor routing.

## Dual-Client Architecture (CRITICAL)
The app uses **two Supabase clients** for auth:
1. **Standard client** (`supabase`) - localStorage-backed, used for general data queries
2. **Persistent client** (`supabasePersistent`) - IndexedDB-backed, for iOS PWA session persistence

**Source of truth:** The persistent client is authoritative for login operations.

**Reconciliation:** `AuthContext.tsx` validates and syncs sessions between both clients:
- Validates each session server-side via `getUser()`
- Clears invalid sessions locally (without calling signOut endpoints to avoid revoking fresh tokens)
- Mirrors valid sessions to both clients
- For `SIGNED_IN` events, the event session is treated as authoritative

## Database Tables
**auth.users** (Supabase managed)
- Email, password (hashed)
- `raw_user_meta_data` (stores display_name, role, avatar_url)

**profiles** (public schema)
- `id` (references auth.users), `display_name`, `email`, `avatar_number`, `tts_voice`, `friend_code`
- Auto-created via `handle_new_user()` trigger

**user_roles** (security requirement)
- `user_id`, `role` (enum: supporter/bestie/caregiver/moderator/admin/owner)
- Separate table prevents privilege escalation attacks

**terms_acceptance**
- `user_id`, `terms_version`, `privacy_version`, `accepted_at`, `ip_address`, `user_agent`
- Enforced site-wide via `TermsAcceptanceGuard`

## Signup Flow
1. User enters: email, password, display name, role (supporter/bestie/caregiver), avatar (optional)
2. Check terms acceptance checkbox (required)
3. `supabasePersistent.auth.signUp()` with metadata (uses persistent client)
4. **Trigger:** `on_auth_user_created` → `handle_new_user()` function
   - Inserts into `profiles` (id, display_name, email)
   - Inserts into `user_roles` (user_id, role)
5. **Terms Recording:** Immediately call `record-terms-acceptance` edge function via persistent client
   - Stores user_id, terms_version, privacy_version, accepted_at
   - Captures IP address and user agent for audit trail
   - Error is caught and logged but doesn't block signup
6. Subscribe to newsletter if opted in
7. Redirect based on role/vendor status via `getPostLoginRedirect()`

**Critical Fix (2025-10-25):** Terms acceptance is now recorded immediately during signup, not deferred. This prevents users from seeing the terms dialog twice.

## Login Flow
1. User enters email/password
2. `supabasePersistent.auth.signInWithPassword()` (uses persistent client)
3. AuthContext mirrors session to standard client
4. Check if user is vendor → redirect to `/vendor-dashboard`
5. Otherwise → redirect to `/community`
6. **Terms Check:** `TermsAcceptanceGuard` enforces acceptance on protected pages

## Picture Password Login
Uses the same persistent client and redirect logic as email/password login:
1. User selects 4-picture sequence
2. Edge function validates and returns session
3. Session set on persistent client
4. AuthContext syncs to standard client
5. Redirect via shared `getPostLoginRedirect()` helper

## Password Reset
1. Click "Forgot Password" → enter email
2. Frontend calls backend function `send-password-reset` (sends via our email provider, from our domain)
3. Email contains a link to `/auth?type=recovery&token_hash=...` on our primary domain
4. User clicks link → lands on `/auth` and clicks **Continue** to verify the one-time token (prevents email client prefetch from consuming it)
5. App verifies token → shows the password update form
6. If link is expired/invalid (e.g. `otp_expired`), show an error and prompt to request a new link
7. Enter new password → updates auth.users

## Session Validation & Cleanup
**Problem:** Stale tokens can cause "session_not_found" errors and false "needs terms acceptance" states.

**Solution:** `AuthContext.reconcileAuthSessions()`:
1. Reads sessions from both localStorage and IndexedDB
2. Validates each by calling `client.auth.getUser()` server-side
3. If validation fails (session_not_found), clears the storage entry locally
4. Does NOT call signOut endpoints (which would revoke valid sessions)
5. Picks winner among valid sessions (prefers persistent)
6. Mirrors winner to both clients

**SIGNED_IN Event Handling:**
- When `onAuthStateChange` fires with `SIGNED_IN`, the event's session is treated as authoritative
- Immediately mirrored to both clients without expiry comparison
- Prevents old sessions with later `expires_at` from "winning"

## Terms Acceptance Guard
**Public Routes:** All `/auth/*` paths, `/terms`, `/privacy`, `/`, `/newsletter`
- Uses `location.pathname.startsWith('/auth')` to cover all auth sub-routes
- Modal never appears on public pages

**Terms Check (`useTermsCheck`):**
- Uses persistent client for database queries (ensures authenticated session)
- Validates session via `getUser()` before querying terms_acceptance
- If no valid session, stays in loading state (doesn't falsely trigger modal)
- On error, defaults to "accepted" (safer than blocking user)

## Role Assignment
**Available Roles:**
- `supporter` - Default, basic access (vendors are supporters with vendor status)
- `bestie` - Community member (can be sponsored)
- `caregiver` - Guardian of besties (can also be a vendor)
- `moderator` - Can moderate content
- `admin` - Full admin access
- `owner` - Super admin

**Assignment:**
- Signup: User selects supporter/bestie/caregiver
- Post-signup: Admin assigns via User Management
- Vendor status: Applied via `/vendor-auth`, checked via vendors table
- Stored in `user_roles` table (NEVER in profiles)

## Avatar System
**Selection:** AvatarPicker component during signup
**Storage:** `avatar_number` in profiles table (1-12)
**Display:** AvatarDisplay component loads from `src/assets/avatars/composite-{number}.png`

## Vendor Status Check
**Check:** After login, queries `vendors` table by `user_id`
**Redirect:** Has vendor record → `/vendor-dashboard`, Others → `/community`
**Note:** Vendor is a status (via vendors table), not a role

## URL Redirect Parameters
**Pattern:** `/auth?redirect=/path&bestieId=xxx`
- Supports post-login redirect to specific pages
- Used for deep linking (e.g., sponsor bestie after login)

## Security Functions
**handle_new_user()** (trigger function)
```sql
SECURITY DEFINER SET search_path = public
```
- Inserts profile + role on signup
- Runs with elevated privileges to bypass RLS

**has_role(_user_id, _role)** (check function)
```sql
SECURITY DEFINER
SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
```
- Used in RLS policies
- Prevents privilege escalation

## Auto-Confirm Email
**Setting:** Enabled via Admin → Auth Config
**Behavior:** Skips email verification step
**Use Case:** Non-production apps, testing

## RLS Policies
**profiles:**
- Users see own profile
- Guardians see linked besties
- Admins see all

**user_roles:**
- SELECT: Authenticated users can view all roles (required for friend code verification)
- INSERT/UPDATE/DELETE: Uses `has_admin_access()` function
- Only admins can modify roles

## Common Issues
| Issue | Fix |
|-------|-----|
| Can't sign up | Check terms acceptance, valid email |
| Wrong redirect | Verify vendor status check |
| Role not assigned | Check `handle_new_user()` trigger |
| ~~Terms loop~~ | **FIXED 2025-10-25:** Terms now recorded during signup |
| Terms appears on /auth/picture | **FIXED 2026-01-31:** Public route check now uses startsWith('/auth') |
| session_not_found errors | **FIXED 2026-01-31:** AuthContext validates and clears invalid tokens |
| Avatar not showing | Check `avatar_number` in profiles |
| Newsletter redirect | Form redirects to landing page after 1.5s |

## UI Details

### "Or" Divider Stacking Order
The login form has an "Or" divider between Sign In and Picture Password buttons. Correct z-index stacking (bottom to top):
1. **Line** (`z-0`) - the horizontal border-t divider
2. **White box** (`z-10`) - breaks the line so text is readable
3. **"Or" text** (`z-20`) - displayed on top of white box
4. **Sign In button** (`z-30`) - button and its orange shadow appear above everything

```tsx
<Button className="relative z-30 ...shadow-warm...">Sign In</Button>
<div className="relative z-0">
  <div className="absolute inset-0 flex items-center z-0">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center z-10">
    <span className="absolute inset-0 mx-auto w-10 bg-card z-10" />
    <span className="relative z-20 px-2 text-muted-foreground">Or</span>
  </div>
</div>
```

**Key Files:**
- `src/contexts/AuthContext.tsx` - Session reconciliation and user state
- `src/lib/authRedirect.ts` - Shared post-login redirect logic
- `src/lib/supabaseWithPersistentAuth.ts` - IndexedDB-backed client
- `src/lib/idbAuthStorage.ts` - IndexedDB storage adapter
- `src/pages/Auth.tsx` - Login/signup UI
- `src/components/auth/PicturePasswordLogin.tsx` - Picture password flow
- `src/components/TermsAcceptanceGuard.tsx` - Terms enforcement wrapper
- `src/components/TermsAcceptanceDialog.tsx` - Terms modal
- `src/hooks/useTermsCheck.ts` - Terms acceptance check
- `supabase/functions/record-terms-acceptance/index.ts` - Edge function

**Triggers:** `on_auth_user_created` → `handle_new_user()`
