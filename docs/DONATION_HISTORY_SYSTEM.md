# Donation History System

## Overview

The Donation History system provides users with a comprehensive view of all their donations (both one-time and recurring) synced directly from Stripe. It uses a **combined transactions table** (`donation_stripe_transactions`) that aggregates data from Stripe invoices, charges, and payment intents.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DONATION HISTORY FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌──────────────────────┐     ┌─────────────────────┐   │
│  │   Stripe    │────▶│ sync-donation-history │────▶│donation_stripe_     │   │
│  │   API       │     │   (Edge Function)     │     │transactions (DB)    │   │
│  └─────────────┘     └──────────────────────┘     └─────────────────────┘   │
│        │                      │                            │                 │
│        │                      │                            ▼                 │
│        │                      │                   ┌─────────────────────┐   │
│        │                      │                   │active_subscriptions_│   │
│        │                      │                   │cache (DB)           │   │
│        │                      │                   └─────────────────────┘   │
│        │                      │                            │                 │
│        │                      ▼                            ▼                 │
│        │             ┌──────────────────┐         ┌─────────────────────┐   │
│        └────────────▶│ MARKETPLACE      │         │ DonationHistory.tsx │   │
│                      │ FILTERING        │         │ (Frontend)          │   │
│                      │ (orders table)   │         └─────────────────────┘   │
│                      └──────────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Tables

### donation_stripe_transactions
**Purpose:** Combined table storing all donation transactions synced from Stripe.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email | text | Donor's email address |
| donor_id | uuid | Link to profiles.id (nullable) |
| donation_id | uuid | Link to donations.id (nullable) |
| receipt_id | uuid | Link to sponsorship_receipts.id (nullable) |
| stripe_invoice_id | text | Stripe invoice ID (for subscription payments) |
| stripe_charge_id | text | Stripe charge ID |
| stripe_payment_intent_id | text | Stripe payment intent ID |
| stripe_subscription_id | text | Stripe subscription ID (for recurring) |
| stripe_customer_id | text | Stripe customer ID |
| amount | numeric | Transaction amount in dollars |
| currency | text | Currency code (USD) |
| frequency | text | "monthly" or "one-time" |
| status | text | Payment status ("paid") |
| transaction_date | timestamptz | When the transaction occurred |
| stripe_mode | text | "live" or "test" |
| designation | text | "General Support" or "Sponsorship: {BestieName}" |
| raw_invoice | jsonb | Full Stripe invoice object |
| raw_charge | jsonb | Full Stripe charge object |
| raw_payment_intent | jsonb | Full Stripe payment intent object |
| merged_metadata | jsonb | Combined metadata from all sources |

### active_subscriptions_cache
**Purpose:** Cache of active recurring subscriptions for quick display.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Link to profiles.id |
| user_email | text | Subscriber's email |
| stripe_subscription_id | text | Stripe subscription ID |
| stripe_customer_id | text | Stripe customer ID |
| amount | numeric | Monthly amount |
| designation | text | What the subscription is for |
| status | text | Subscription status |
| current_period_end | timestamptz | When current period ends |
| stripe_mode | text | "live" or "test" |

### donation_sync_status
**Purpose:** Tracks sync status per user for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| user_email | text | User's email |
| stripe_mode | text | "live" or "test" |
| last_synced_at | timestamptz | Last successful sync |
| sync_status | text | "completed" or "error" |
| donations_synced | int | Count of transactions synced |
| subscriptions_synced | int | Count of subscriptions synced |
| error_message | text | Error details if failed |

## Edge Function: sync-donation-history

### Trigger Methods
1. **Manual Sync:** User clicks "Refresh" button in DonationHistory component
2. **Cron Job:** Scheduled automatic sync for all users (via x-schedule header)

### Processing Flow

```
1. AUTHENTICATION
   ├── Check for Authorization header (manual sync)
   └── Check for x-schedule/x-cron-secret header (cron job)

2. LOAD CONFIGURATION
   ├── Get stripe_mode from app_settings
   └── Initialize Stripe client with appropriate key

3. DETERMINE EMAILS TO SYNC
   ├── Manual: Just the authenticated user's email
   └── Cron: All emails from donations, sponsorships, and existing cache

4. LOAD LOOKUP MAPS
   ├── sponsorships → subscription_id/customer_id → designation
   ├── donations → payment_intent_id → donation.id
   ├── sponsorship_receipts → transaction_id → receipt.id
   └── orders → stripe_payment_intent_id (for marketplace filtering)

5. FOR EACH EMAIL:
   ├── Find Stripe customer by email
   ├── Fetch invoices (paid, limit 100)
   ├── Fetch charges (limit 100)
   ├── Fetch payment_intents (limit 100)
   │
   ├── PROCESS INVOICES:
   │   ├── Skip if amount_paid <= 0
   │   ├── Combine metadata from invoice + charge + payment_intent
   │   ├── SKIP if order_id in metadata (marketplace)
   │   ├── SKIP if payment_intent matches orders.stripe_payment_intent_id
   │   ├── Determine designation (sponsorship vs general)
   │   └── Create transaction record
   │
   ├── PROCESS STANDALONE CHARGES:
   │   ├── Skip if already linked to an invoice
   │   ├── Skip if status !== "succeeded"
   │   ├── Combine metadata from charge + payment_intent
   │   ├── SKIP if order_id in metadata (marketplace)
   │   ├── SKIP if payment_intent matches orders.stripe_payment_intent_id
   │   ├── Determine designation
   │   └── Create transaction record
   │
   ├── UPSERT TO donation_stripe_transactions
   │   └── Match by stripe_invoice_id OR stripe_charge_id
   │
   ├── SYNC ACTIVE SUBSCRIPTIONS
   │   └── Upsert to active_subscriptions_cache
   │
   └── UPDATE donation_sync_status

6. RETURN SUMMARY
   └── { emailsProcessed, transactionsSynced, subscriptionsSynced }
```

### Critical: Marketplace Filtering

Store/marketplace purchases must be **excluded** from donation history. The sync function uses TWO methods:

1. **Metadata Check:** Skip transactions where any metadata source contains `order_id`
   ```typescript
   // Check combined metadata from invoice, charge, and payment_intent
   if (combinedMetadata.order_id) {
     logStep("Skipping marketplace charge (metadata)");
     continue;
   }
   ```

2. **Orders Table Check:** Skip transactions whose `stripe_payment_intent_id` exists in `orders` table
   ```typescript
   // Load all marketplace order payment intents upfront
   const { data: ordersData } = await supabaseAdmin
     .from("orders")
     .select("stripe_payment_intent_id")
     .not("stripe_payment_intent_id", "is", null);
   
   const marketplacePaymentIntentIds = new Set<string>();
   ordersData?.forEach(o => {
     if (o.stripe_payment_intent_id) {
       marketplacePaymentIntentIds.add(o.stripe_payment_intent_id);
     }
   });
   
   // During processing:
   if (piId && marketplacePaymentIntentIds.has(piId)) {
     logStep("Skipping marketplace charge (order match)");
     continue;
   }
   ```

**Why both methods?**
- Metadata check catches transactions with explicit `order_id` in Stripe
- Orders table check catches marketplace purchases where `order_id` wasn't propagated to charge/invoice metadata (common when it's only in checkout session)

## Frontend Component: DonationHistory.tsx

### Location
- `src/components/sponsor/DonationHistory.tsx`
- Used on: `/donation-history` page, `/guardian-links` page

### Features

1. **Transaction History Table**
   - Date, Designation, Amount, Type (Monthly/One-Time), Status, Receipt link
   - Filter by year
   - Receipt URL extracted from `raw_invoice.hosted_invoice_url` or `raw_charge.receipt_url`

2. **Active Subscriptions Display**
   - Shows all active recurring donations
   - "Manage Subscriptions" button opens Stripe Customer Portal

3. **Year-End Summary**
   - Cards for each year with total donations
   - Download as HTML or send via email
   - Invokes `generate-year-end-summary` edge function

4. **Stripe Mode Toggle (Admin/Owner only)**
   - Switch between "live" and "test" mode to see different transaction sets

### Data Flow

```typescript
// Query transactions
const { data: txData } = await supabase
  .from("donation_stripe_transactions")
  .select("*")
  .eq("email", userEmail)
  .eq("stripe_mode", stripeMode)
  .order("transaction_date", { ascending: false });

// Query active subscriptions
const { data: subData } = await supabase
  .from("active_subscriptions_cache")
  .select("*")
  .eq("user_email", userEmail)
  .eq("stripe_mode", stripeMode)
  .eq("status", "active");
```

## Designation Logic

Transactions are categorized as either:
- **"General Support"** - General donations
- **"Sponsorship: {BestieName}"** - Bestie sponsorships

**Determination order:**
1. Check if `stripe_subscription_id` maps to a sponsorship → use bestie name
2. Check if `stripe_customer_id` maps to a sponsorship → use bestie name  
3. Check if metadata contains `type: "donation"` → "General Support"
4. Default → "General Support"

## Related Edge Functions

| Function | Purpose |
|----------|---------|
| sync-donation-history | Sync Stripe data to donation_stripe_transactions |
| generate-year-end-summary | Generate tax summary for a given year |
| manage-sponsorship | Open Stripe Customer Portal for subscription management |

## Troubleshooting

### Store purchases appearing in donation history
**Cause:** Payment intent not filtered properly
**Fix:** Ensure `orders.stripe_payment_intent_id` is set correctly by `verify-marketplace-payment`, and the sync function checks against the orders table

### Missing transactions
**Cause:** Sync hasn't run, or Stripe customer not found by email
**Fix:** Click "Refresh" button or check that email matches Stripe customer email

### Wrong designation
**Cause:** Sponsorship record not linked by subscription_id or customer_id
**Fix:** Verify sponsorships table has correct `stripe_subscription_id` and `stripe_customer_id`

## Files

| File | Purpose |
|------|---------|
| src/components/sponsor/DonationHistory.tsx | Frontend component |
| src/pages/DonationHistoryPage.tsx | Standalone page wrapper |
| supabase/functions/sync-donation-history/index.ts | Stripe sync function |
| supabase/functions/generate-year-end-summary/index.ts | Tax summary generation |

## Security

- Users can only see their own transactions (filtered by email)
- Stripe mode visibility restricted to admin/owner roles
- Raw Stripe objects stored for audit/debugging but not exposed in UI
