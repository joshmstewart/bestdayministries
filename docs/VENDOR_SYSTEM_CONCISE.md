VENDOR SYSTEM - CONCISE DOCS

## Architecture Change (2025-10-08)
**Vendor is now a STATUS, not a role.** Users maintain their primary role (supporter, bestie, caregiver) and have vendor capabilities added via the `vendors` table.

## Key Benefit
- Guardians can manage their bestie's vendor account without separate login
- Besties can be artisans with guardian admin support
- One account, multiple capabilities

## Database Schema

**vendors**
- `id`, `user_id`, `business_name`, `description`, `status` (pending/approved/rejected/suspended)
- User's primary role stays in `user_roles` table (supporter/bestie/caregiver)

**products**
- `id`, `vendor_id`, standard product fields
- **RLS:** Vendors CRUD own products (if approved)

## Vendor Flows

**Become Vendor** (`/vendor-auth` or Marketplace)
1. User signs up OR existing user applies
2. Creates `vendors` record (pending)
3. Admin approves → status: 'approved'
4. User accesses `/vendor-dashboard`

**Check Vendor Status**
```typescript
const { data: vendor } = await supabase
  .from('vendors')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

**Dashboard** (`/vendor-dashboard`)
- Checks `vendors.status` (pending/approved/rejected)
- Tabs: Products, Orders, Earnings, Payments, Settings

## Role + Vendor Examples
- **Caregiver + Vendor:** Manages bestie's art products
- **Bestie + Vendor:** Sells own creations
- **Supporter + Vendor:** Community member selling items

## Migration Notes
- All existing vendor role users → supporter role
- Vendor status preserved in `vendors` table
- No functionality lost, flexibility gained

**Files:** `VendorAuth.tsx`, `VendorDashboard.tsx`, `VendorManagement.tsx` (admin), `vendors` table
