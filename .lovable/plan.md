

## Plan: Add Logical Links to Vendor Info Page

Currently, `/vendor-info` exists but is only reachable if someone knows the URL. Here are the logical places to add links:

### 1. Marketplace Page — "Become a Vendor" link
The existing "Become a Vendor" button (line ~323-328 in `Marketplace.tsx`) goes directly to `/vendor-auth` or `/vendor-dashboard`. We should add a secondary "Learn more about selling" link nearby that points to `/vendor-info`, so potential vendors can read about the program before applying.

### 2. Vendor Auth Page — Info link
On the `/vendor-auth` signup page (~line 704-707 in `VendorAuth.tsx`), add a "Learn what's involved" or "View vendor details" link to `/vendor-info` so users can review terms before applying.

### 3. Vendor Dashboard — "Not yet a vendor" state
The `VendorDashboard.tsx` "Become a Vendor" card (line ~361-372) already links to `/vendor-auth`. Add a "Learn more" link to `/vendor-info` here as well.

### 4. Footer — Database update
Since the footer is database-driven, we'd add a "Become a Vendor" link pointing to `/vendor-info` in the appropriate footer section. This requires updating the `footer_links` table — no code change needed, just a database insert.

### Summary of File Changes
| File | Change |
|------|--------|
| `src/pages/Marketplace.tsx` | Add "Learn more" link to `/vendor-info` near "Become a Vendor" |
| `src/pages/VendorAuth.tsx` | Add "Learn about the program" link to `/vendor-info` |
| `src/pages/VendorDashboard.tsx` | Add "Learn more" link in the non-vendor CTA card |
| Database: `footer_links` | Insert a "Become a Vendor" link to `/vendor-info` in relevant footer section |

