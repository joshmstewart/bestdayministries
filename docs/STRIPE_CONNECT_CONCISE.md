# STRIPE CONNECT - CONCISE DOCS

## Overview
Vendor payout system using Stripe Connect Express with automatic commission splits.

## Database Schema

**vendors** (Extensions)
- `stripe_account_id`, `stripe_onboarding_complete`, `stripe_charges_enabled`, `stripe_payouts_enabled`

**commission_settings**
- `commission_percentage` (default 10%), `created_by`, timestamps
- RLS: Admins only

**order_items** (Extensions)
- `platform_fee`, `vendor_payout`, `stripe_transfer_id`

**vendor_earnings** (View)
- Aggregates: `total_orders`, `total_earnings`, `total_fees`, `total_sales`
- Filters by `vendor_id`, only shipped/delivered orders

---

## Edge Functions

**create-stripe-connect-account**
- Auth: Yes
- Creates/retrieves Stripe Express account
- Returns: `accountId`, `onboardingUrl`, status flags

**check-stripe-connect-status**
- Auth: Yes
- Syncs Stripe account status to DB
- Updates: `stripe_onboarding_complete`, charges/payouts enabled

---

## Frontend Components

**StripeConnectOnboarding** (`src/components/vendor/StripeConnectOnboarding.tsx`)
- Location: Vendor Dashboard → Settings
- States: Not Connected → Onboarding Incomplete → Fully Connected
- Auto-checks status on mount

**VendorEarnings** (`src/components/vendor/VendorEarnings.tsx`)
- Location: Vendor Dashboard → Earnings
- Displays: Total Earnings, Total Sales, Platform Fees

---

## Vendor Dashboard
Tabs: Products, Orders, **Earnings** (new), **Settings** (updated)

---

## ✅ Implemented

### Checkout Flow
- **Single-vendor orders**: Direct charge with `application_fee_amount` → vendor gets paid instantly
- **Multi-vendor orders**: Platform receives payment, transfers triggered on fulfillment

### Vendor Payouts (Fulfillment-Triggered)
- When vendor marks item as "shipped" → `submit-tracking` → `create-vendor-transfer`
- **Intelligent fund detection**: If platform balance is insufficient (customer payment still settling), marks as `pending_funds`
- **Auto-retry**: `retry-vendor-transfers` runs hourly, automatically completes transfers when funds available
- Transfer ID stored in `order_items.stripe_transfer_id`

### Transfer Status Tracking
- `order_items.transfer_status`: `pending` | `pending_funds` | `transferred` | `failed`
- `order_items.transfer_error_message`: Human-readable explanation
- `order_items.transfer_attempts`: Retry count
- Vendor UI shows clear status badges with tooltips

### Shipping
- Flat rate: $6.99 per vendor
- Free shipping: Orders over $35 per vendor

### Platform Payout with Reserve
- `process-platform-payout` runs weekly (Mondays at 12:00 UTC)
- Keeps $100 reserve in platform Stripe account for vendor transfers
- Only pays out `available_balance - $100` to bank
- Configurable via `app_settings.payout_reserve_amount`

---

## ❌ NOT IMPLEMENTED

### Nice to Have
- Admin commission settings UI (currently 20% default in DB)
- Vendor payout dashboard with filters
- Vendor profile editing
- Email notifications for orders

---

## Security
- All edge functions require JWT auth
- Vendors see only their earnings (RLS via view)
- Commission settings: Admins only
- Uses `MARKETPLACE_STRIPE_SECRET_KEY_LIVE` / `MARKETPLACE_STRIPE_SECRET_KEY_TEST` (Joy House Store account)
- **Separate from donation Stripe account** (Best Day Ministries) - ensures proper tax reporting

---

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Onboarding incomplete | Click "Complete Onboarding" |
| Earnings not showing | Check vendor status = 'approved' + Stripe connected |
| Commission not calculating | Verify commission_settings table has record |
| Payout stuck on "Processing" | Normal - customer payment takes 2-3 days to settle, then auto-retries |
| Reserve not keeping $100 | Check `app_settings.payout_reserve_amount` setting |

---

**Files:** `StripeConnectOnboarding.tsx`, `VendorEarnings.tsx`, `VendorDashboard.tsx`, `VendorPayoutStatus.tsx`, edge functions in `supabase/functions/`