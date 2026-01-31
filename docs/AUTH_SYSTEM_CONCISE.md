AUTH SYSTEM - CONCISE

## Overview
Authentication system (`/auth`) with signup/login, role assignment, terms acceptance, and vendor routing.

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
3. `supabase.auth.signUp()` with metadata
4. **Trigger:** `on_auth_user_created` → `handle_new_user()` function
   - Inserts into `profiles` (id, display_name, email)
   - Inserts into `user_roles` (user_id, role)
5. **Terms Recording:** Immediately call `record-terms-acceptance` edge function
   - Stores user_id, terms_version, privacy_version, accepted_at
   - Captures IP address and user agent for audit trail
   - Error is caught and logged but doesn't block signup
6. Subscribe to newsletter if opted in
7. Redirect based on role/vendor status

**Critical Fix (2025-10-25):** Terms acceptance is now recorded immediately during signup, not deferred. This prevents users from seeing the terms dialog twice.

## Login Flow
1. User enters email/password
2. `supabase.auth.signInWithPassword()`
3. Check if user is vendor → redirect to `/vendor-dashboard`
4. Otherwise → redirect to `/community`
5. **Terms Check:** `TermsAcceptanceGuard` enforces acceptance on protected pages

## Password Reset
1. Click "Forgot Password" → enter email
2. Frontend calls backend function `send-password-reset` (sends via our email provider, from our domain)
3. Email contains a link to `/auth?type=recovery&token_hash=...` on our primary domain
4. User clicks link → lands on `/auth` and clicks **Continue** to verify the one-time token (prevents email client prefetch from consuming it)
5. App verifies token → shows the password update form
6. If link is expired/invalid (e.g. `otp_expired`), show an error and prompt to request a new link
7. Enter new password → updates auth.users

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

## Terms Acceptance
**Enforcement:** `TermsAcceptanceGuard` wraps App.tsx
**Check:** Queries `terms_acceptance` for current user + version
**Dialog:** `TermsAcceptanceDialog` non-dismissible modal
**Trigger:** On version change or first login
**Versions:** `CURRENT_TERMS_VERSION = "1.0"`, `CURRENT_PRIVACY_VERSION = "1.0"` (in `useTermsCheck.ts`)

### Auth Storage Sync (Critical)
Some clients use IndexedDB-backed auth storage (for iOS PWA persistence), but much of the app (including the terms check) uses the standard client.

**Rule:** `AuthProvider` must mirror the persistent session into the standard client, and clear ONLY local standard-client auth when persistent logs out.

**Why:** Prevents unauthenticated `terms_acceptance` queries (which cause the Terms dialog to re-open immediately) and prevents “ghost user” UI (showing a previous user).

**Implementation:** `src/contexts/AuthContext.tsx` → `syncStandardClientSession()`.

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

**Files:** `Auth.tsx`, `TermsAcceptanceGuard.tsx`, `TermsAcceptanceDialog.tsx`, `useTermsCheck.ts`, `record-terms-acceptance/index.ts`

**Triggers:** `on_auth_user_created` → `handle_new_user()`
