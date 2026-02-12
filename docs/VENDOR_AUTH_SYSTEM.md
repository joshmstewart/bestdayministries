# VENDOR AUTHENTICATION SYSTEM

## Overview
Vendor application system where ANY authenticated user can apply to become a vendor, creating a record in the `vendors` table.

## Application Flow

**Route:** `/vendor-auth`

### For New Users (Sign Up Only)
1. Enter: Display Name, Business Name, Email, Password
2. System creates auth account with 'supporter' role
3. Inserts `vendors` record with 'pending' status
4. Redirects to `/vendor-dashboard` (shows pending message)

### For Existing Users
Existing users should use the regular `/auth` login, then:
- Navigate to Marketplace → "Become a Vendor" button
- Or go directly to `/vendor-dashboard` → "Apply to Become a Vendor"

**Note:** The `/vendor-auth` page is signup-only. There is no sign-in form on this page - existing users are directed to the standard auth flow.

## Alternative Entry Point
**Marketplace "Become a Vendor" button** → Can redirect to:
- `/vendor-auth` (if not logged in)
- `/vendor-dashboard` (if logged in) → Apply button if no vendor record

## Vendor Check Pattern
```typescript
// Check if user has vendor capabilities (owner OR accepted team member)
const { data: owned } = await supabase
  .from('vendors')
  .select('id')
  .eq('user_id', userId)
  .limit(1);

const { data: team } = await supabase
  .from('vendor_team_members')
  .select('id')
  .eq('user_id', userId)
  .not('accepted_at', 'is', null)
  .limit(1);

const hasVendorAccess = (owned?.length ?? 0) > 0 || (team?.length ?? 0) > 0;

if (hasVendorAccess) {
  // User can access vendor features
}
```

## Homepage Preference
Vendors can set the Vendor Dashboard as their default homepage on login:
- **Button:** "Make This My Homepage" / "Reset Homepage" toggle in top-right of dashboard
- **Storage:** `profiles.default_homepage` column (NULL = default /community, 'vendor-dashboard' = go to dashboard)
- **Login Check:** Auth.tsx checks this preference and redirects accordingly
- **Reset:** Click "Reset Homepage" to return to default /community redirect

## Key Difference from Old System
- **Old:** Vendor was a separate role, users needed vendor-specific login
- **New:** Vendor is a status, any user can apply while keeping their primary role
- **Benefit:** Guardians can manage bestie vendor accounts, one login for all features

## Auth Detection (CRITICAL)
- VendorAuth uses `useAuth()` from AuthContext (NOT manual `getSession()` calls)
- AuthContext handles dual-client (localStorage + IndexedDB) reconciliation
- Page shows loading spinner until AuthContext `loading` is false
- If `isAuthenticated` → skips signup form → shows vendor application directly
- If not authenticated → shows signup + vendor application combined form

**Files:** `VendorAuth.tsx`, `VendorDashboard.tsx`, `Auth.tsx`
