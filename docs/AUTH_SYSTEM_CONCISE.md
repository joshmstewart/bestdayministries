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
5. Call `record-terms-acceptance` edge function (stores IP, user agent)
6. Redirect based on role/vendor status

## Login Flow
1. User enters email/password
2. `supabase.auth.signInWithPassword()`
3. Check if user is vendor → redirect to `/vendor-dashboard`
4. Otherwise → redirect to `/community`
5. **Terms Check:** `TermsAcceptanceGuard` enforces acceptance on protected pages

## Password Reset
1. Click "Forgot Password" → enter email
2. `supabase.auth.resetPasswordForEmail()`
3. Email sent with reset link
4. User clicks link → redirected to `/auth` with reset token
5. Enter new password → updates auth.users

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
- Uses `has_admin_access()` function
- Only admins can modify roles

## Common Issues
| Issue | Fix |
|-------|-----|
| Can't sign up | Check terms acceptance, valid email |
| Wrong redirect | Verify vendor status check |
| Role not assigned | Check `handle_new_user()` trigger |
| Terms loop | Verify `terms_acceptance` record created |
| Avatar not showing | Check `avatar_number` in profiles |

**Files:** `Auth.tsx`, `TermsAcceptanceGuard.tsx`, `TermsAcceptanceDialog.tsx`, `useTermsCheck.ts`, `record-terms-acceptance/index.ts`

**Triggers:** `on_auth_user_created` → `handle_new_user()`
