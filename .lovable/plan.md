

## Plan: Restrict Financial Tabs to Owner-Only Access

### What Changes

1. **Hide the "Donations" tab trigger** from non-owner admins (line ~286 in Admin.tsx)
   - Wrap the `<TabsTrigger value="sponsorships">` in an `{isOwner && ...}` conditional
   - Also wrap the corresponding `<TabsContent value="sponsorships">` (line ~472) in the same conditional

2. **Hide the StripeModeSwitcher** components from non-owner admins
   - The `<StripeModeSwitcher />` on the Donations tab is already gated by #1
   - The `<MarketplaceStripeModeSwitcher />` on the Store tab (line ~785) — wrap it in `{isOwner && ...}` so admins can still manage vendors/products but can't switch Stripe modes

3. **Prevent URL-based access** — if a non-owner admin navigates to `?tab=sponsorships`, the tab content simply won't render (since the `TabsContent` is gated), so they'll see the default tab instead.

### Files Modified
- `src/pages/Admin.tsx` — 3 small conditional wrappers using existing `isOwner` state

### No database or RLS changes needed
This is a UI-level restriction. The backend RLS already uses `has_admin_access()` which covers both admin and owner. Since the financial data (transactions, receipts, webhook logs) is only accessible through admin UI and edge functions that require admin access, hiding the UI from non-owner admins is sufficient. The Stripe secret keys are in edge functions, not exposed to the frontend.

