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

## ❌ NOT IMPLEMENTED

### Critical (Blocks Production)
- **Customer Checkout Flow:**
  - Calculate commission splits per vendor
  - Use `payment_intent_data.application_fee_amount` for platform fee
  - Use `payment_intent_data.transfer_data.destination` for vendor payout
- **Stripe Webhooks:**
  - `payment_intent.succeeded` → Mark order paid
  - `account.updated` → Sync vendor status
  - `transfer.created/failed` → Track payouts
- **Automatic Transfers:** Create transfers on order fulfillment
- **Multi-Vendor Orders:** Split orders with products from multiple vendors

### Important
- Admin commission settings UI
- Vendor payout dashboard with filters

### Nice to Have
- Vendor profile editing, email notifications

---

## Security
- All edge functions require JWT auth
- Vendors see only their earnings (RLS via view)
- Commission settings: Admins only
- Uses `STRIPE_SECRET_KEY`

---

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Onboarding incomplete | Click "Complete Onboarding" |
| Earnings not showing | Check vendor status = 'approved' + Stripe connected |
| Commission not calculating | Verify commission_settings table has record |

---

**Files:** `StripeConnectOnboarding.tsx`, `VendorEarnings.tsx`, `VendorDashboard.tsx`, edge functions in `supabase/functions/`