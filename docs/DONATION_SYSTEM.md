# DONATION SYSTEM - COMPLETE DOCUMENTATION

## 🚨 CRITICAL PRINCIPLE: API-FIRST, NOT WEBHOOK-FIRST 🚨

**STRIPE API IS THE SOURCE OF TRUTH. DATABASE IS A CACHE. WEBHOOKS ARE UNRELIABLE.**

This system uses an **API-first approach**:
1. **User-facing donation history**: ALWAYS fetches from Stripe API directly via `get-donation-history` edge function
2. **Database records**: Are a cache/supplement, NOT the source of truth
3. **Webhooks**: Are used for background processing (receipts, notifications) but NEVER relied upon for user-facing data
4. **Reconciliation**: Runs hourly to catch any missed webhook events, but users never see stale data because we query Stripe directly

**WHY:**
- Webhooks can fail, be delayed, or be missed entirely
- Database records can be corrupted or out of sync
- Stripe API ALWAYS has the correct current state
- Users should NEVER see incorrect donation history

**IMPLEMENTATION:**
- `/donation-history` page calls `get-donation-history` edge function
- Edge function queries Stripe API for charges, subscriptions, and invoices
- Returns data directly from Stripe, ensuring accuracy
- No dependency on webhooks for user-facing features

---

## OVERVIEW
General donation system on the Support Us page (`/support`) allowing one-time and monthly recurring donations via Stripe.

## DATABASE SCHEMA

**donations**
- `id` (uuid, primary key)
- `donor_id` (uuid, nullable) - Links to profiles for authenticated users
- `donor_email` (text, nullable) - Email for guest donations
- `amount` (numeric) - Donation amount in dollars
- `frequency` (text) - 'one-time' or 'monthly'
- `status` (text) - **CRITICAL: Must allow 'pending', 'completed', 'active', 'cancelled', 'paused'**
- `stripe_customer_id` (text, nullable) - **ALWAYS set** - Stripe customer ID for both one-time and monthly
- `stripe_subscription_id` (text, nullable) - **Only for monthly** donations
- `stripe_mode` (text) - 'test' or 'live'
- `started_at`, `ended_at`, `created_at`, `updated_at` (timestamps)

**Database Constraint:**
```sql
-- CRITICAL: Status check constraint MUST include 'pending' and 'completed'
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE donations ADD CONSTRAINT donations_status_check 
  CHECK (status IN ('pending', 'completed', 'active', 'cancelled', 'paused'));
```

**RLS Policies:**
- Admins can view all donations
- Donors can view their own donations (by `donor_id` OR by matching email from `auth.users`)
- Public can INSERT (handled by edge function, not direct client calls)

**Common Issues:**
- ❌ **WRONG**: Constraint only allowing 'active', 'cancelled', 'paused' → donations fail silently
- ✅ **CORRECT**: Constraint must include 'pending' (used by edge function) and 'completed' (used by webhook)

---

## USER WORKFLOW

### Making a Donation

**Location:** `/support` page

**Steps:**
1. User selects frequency (Monthly or One-Time)
2. Selects preset amount ($10, $25, $50, $100, $250) or enters custom amount (min $5, max $100,000)
3. Enters email (auto-filled if logged in, but always editable)
4. Optional: Check "Cover processing fees" box (adds ~3% to cover Stripe fees)
5. Accepts Terms & Conditions checkbox
6. Clicks "Donate Now" button
7. Redirects to Stripe Checkout
8. After payment, redirects to `/support?donation=success`

**Guest Checkout:**
- No account required to donate
- Donations stored with `donor_email` instead of `donor_id`
- When user creates account with matching email, donations could be linked (future feature)

---

## STRIPE INTEGRATION

### Edge Functions

**get-donation-history** ⭐ PRIMARY - API-FIRST
- **Location:** `supabase/functions/get-donation-history/index.ts`
- **Auth:** JWT required (authenticated users only)
- **Purpose:** Fetch donation history DIRECTLY from Stripe API - the source of truth
- **Flow:**
  1. Authenticates user via JWT
  2. Looks up Stripe customer by user email
  3. Fetches ALL charges, subscriptions, and invoices from Stripe API
  4. De-dupes invoice-backed charges and classifies designation using (a) DB sponsorship cache (fallback) → (b) Stripe subscription metadata → (c) invoice/payment-intent metadata
  5. Returns combined donation history with receipt URLs
- **Response:**
  ```typescript
  {
    donations: Array<{
      id: string;
      amount: number;
      frequency: "one-time" | "monthly";
      status: string;
      created_at: string;
      designation: string;
      receipt_url?: string;
    }>;
    subscriptions: Array<{
      id: string;
      amount: number;
      designation: string;
      status: string;
      current_period_end: string;
      cancel_at_period_end: boolean;
    }>;
    stripe_mode: "test" | "live";
  }
  ```
- **WHY THIS EXISTS:** Users should ALWAYS see accurate data from Stripe, not potentially stale database records

**create-donation-checkout**
- **Location:** `supabase/functions/create-donation-checkout/index.ts`
- **Auth:** No JWT required (public access)
- **Request:** `{amount, frequency, email, coverStripeFee}`
- **Validation:** Zod schema validates amount ($5-$100,000), frequency, email format
- **Flow:**
  1. Gets Stripe mode from `app_settings` table ('test' or 'live')
  2. Calculates final amount with optional Stripe fee coverage
  3. Creates/retrieves Stripe customer by email
  4. Creates Stripe Checkout session:
     - Mode: 'payment' (one-time) or 'subscription' (monthly)
     - Metadata: `{type: 'donation', frequency, amount, coverStripeFee, donation_type: 'general'}`
  5. Inserts 'pending' donation record in database (as cache)
  6. Returns `{url}` for redirect to Stripe Checkout
- **Success URL:** `/support?donation=success`
- **Cancel URL:** `/support`

**stripe-webhook** (Background Processing Only)
- **Location:** `supabase/functions/stripe-webhook/index.ts`
- **Auth:** Verified via Stripe webhook signature
- **Purpose:** Background processing for receipts and notifications - NOT for user-facing data
- **Important:** Webhooks are UNRELIABLE. Never rely on them for user-facing features.
- **Dual Mode Support:** Handles both test and live webhooks

**Handled Events:**

1. **checkout.session.completed** (with `metadata.type = 'donation'`)
   - **One-Time Donations (mode: 'payment'):**
     ```typescript
     UPDATE donations
     SET status = 'completed'
     WHERE donor_email = [email]
       AND amount = [amount]
       AND frequency = 'one-time'
       AND status = 'pending'
     ```
   
   - **Monthly Donations (mode: 'subscription'):**
     ```typescript
     UPDATE donations
     SET status = 'active',
         stripe_subscription_id = [subscription_id],
         started_at = NOW()
     WHERE donor_email = [email]
       AND amount = [amount]
       AND frequency = 'monthly'
       AND status = 'pending'
     ```

2. **customer.subscription.updated** (with `metadata.type = 'donation'`)
   - Updates donation status based on subscription state:
     - Active → `status = 'active'`, `ended_at = NULL`
     - Scheduled cancellation → `status = 'active'`, `ended_at = [cancel_at]`
     - Cancelled → `status = 'cancelled'`, `ended_at = NOW()`

3. **customer.subscription.deleted** (with `metadata.type = 'donation'`)
   - Updates donation: `status = 'cancelled'`, `ended_at = NOW()`

---

## FRONTEND COMPONENTS

**DonationForm**
- **Location:** `src/components/DonationForm.tsx`
- **Features:**
  - Frequency toggle (Monthly/One-Time)
  - Preset amount buttons ($10-$250)
  - Custom amount input with validation
  - Email input (auto-filled from profile)
  - "Cover processing fees" checkbox
  - Terms acceptance checkbox
  - Amount summary display
- **Validation:**
  - Amount: min $5, max $100,000
  - Email: valid format required
  - Terms: must be accepted
- **State Management:**
  - `frequency`, `amount`, `email`, `acceptedTerms`, `coverStripeFee`, `loading`
  - `checkAuthAndLoadEmail()` - Fetches logged-in user email
  - `calculateTotal()` - Adds Stripe fees if selected
  - `handleDonation()` - Calls edge function and redirects to Stripe

---

## STATUS FLOW

### One-Time Donations
```
1. Edge function creates: status = 'pending', stripe_customer_id = [customer_id]
2. Webhook (checkout.session.completed): status = 'completed'
   - Query: WHERE donor_email = [email] AND amount = [amount] AND frequency = 'one-time' AND status = 'pending'
```

### Monthly Donations
```
1. Edge function creates: status = 'pending', stripe_customer_id = [customer_id]
2. Webhook (checkout.session.completed): status = 'active', stripe_subscription_id = [sub_id]
   - Query: WHERE donor_email = [email] AND amount = [amount] AND frequency = 'monthly' AND status = 'pending'
3. Webhook (customer.subscription.updated): Updates status based on subscription state
   - Active → status = 'active', ended_at = NULL
   - Scheduled cancellation → status = 'active', ended_at = [cancel_at]
   - Cancelled → status = 'cancelled', ended_at = NOW()
4. Webhook (customer.subscription.deleted): status = 'cancelled', ended_at = NOW()
```

**CRITICAL DEBUGGING:**
- If donations stay 'pending' forever → Check database constraint allows 'completed' status
- If donations never appear → Check database constraint allows 'pending' status
- Check Stripe webhook logs for delivery issues
- Check edge function logs for creation issues

---

## STRIPE FEE COVERAGE

**Formula:** `finalAmount = (amount + 0.30) / 0.971`

**Example:**
- Donation: $25.00
- Stripe Fee: ~$0.75
- Total Charged: $25.75
- Net to Organization: $25.00

**Implementation:**
- Checkbox in UI
- Calculated in `create-donation-checkout` edge function
- Passed to Stripe as `unit_amount` in cents

---

## DONATION RECEIPT GENERATION

Donations automatically generate tax-deductible receipts through the same system used for sponsorships:

### Automatic Receipt Generation (Webhook)

When a donation is completed via Stripe Checkout:

1. The `stripe-webhook` edge function receives `checkout.session.completed` event
2. For one-time donations: Updates status to `completed` and calls `createAndSendReceipt()`
3. For monthly donations: Updates status to `active` and calls `createAndSendReceipt()`
4. Receipt is created in `sponsorship_receipts` table with `transaction_id = donation_{id}`
5. Receipt PDF is generated and emailed to donor via Resend

**Code Location**: `supabase/functions/stripe-webhook/index.ts`
- Lines 742-761: One-time donation receipt generation
- Lines 954-970: Monthly donation receipt generation

### Manual Backfill (Admin UI)

If donations are missing receipts due to past webhook failures:

1. Navigate to Admin → Besties → Transactions tab
2. Click "Generate Donation Receipts" button
3. System calls `generate-missing-donation-receipts` edge function
4. Function finds all donations without receipts and creates them
5. Receipts are automatically emailed to donors

**Edge Function**: `supabase/functions/generate-missing-donation-receipts/index.ts`
- Queries donations with status `active` or `completed`
- Checks which ones are missing receipts (no matching `transaction_id`)
- Creates receipt records with proper donor information
- Sends receipt emails via `send-sponsorship-receipt` edge function

### Receipt Data for Donations

Donation receipts use these values:
- **Transaction ID**: `donation_{donation.id}` (unique identifier)
- **Sponsor Email**: From `donor_email` or user profile
- **Sponsor Name**: From user profile or "Donor"
- **Bestie Name**: "General Donation" (donations not tied to specific besties)
- **Amount**: `amount_charged` if available (includes fees), otherwise `amount`
- **Frequency**: `monthly` or `one-time`
- **Stripe Mode**: `test` or `live`

### Why Receipts May Be Missing

1. **Webhook didn't fire**: Stripe webhook configuration issues
2. **Webhook failed silently**: Database or email errors during processing
3. **Race condition**: Multiple webhook events processed simultaneously
4. **Legacy donations**: Created before receipt system was implemented

### Troubleshooting

**Problem**: Donation receipts not appearing in transactions list

**Solution**: 
1. Check if donation status is `active` or `completed` (only these generate receipts)
2. Run "Generate Donation Receipts" from Admin UI
3. Check edge function logs: `supabase functions logs generate-missing-donation-receipts`
4. Verify Stripe webhook is configured correctly (see `WEBHOOK_CONFIGURATION_GUIDE.md`)

**Problem**: Receipt generated but email not sent

**Solution**:
1. Check `sponsorship_receipts` table for receipt record
2. Check `email_audit_log` for email send attempt
3. Verify Resend API key is configured
4. Manually resend via Admin UI if needed

---

## KEY DIFFERENCES FROM SPONSORSHIPS

| Feature | Donations | Sponsorships |
|---------|-----------|--------------|
| **Purpose** | General support | Support specific bestie |
| **Recipient** | Organization | Bestie (via organization) |
| **Metadata** | `type: 'donation'` | `bestie_id` |
| **Table** | `donations` | `sponsorships` |
| **UI Location** | `/support` page | `/sponsor-bestie` page |
| **Guest Checkout** | Supported | Supported |
| **Monthly Support** | Available | Available |
| **Receipts** | Not implemented | Automated |
| **Year-End Summaries** | Not implemented | Automated |

---

## IMPLEMENTED FEATURES ✅

- One-time donations via Stripe Checkout
- Monthly recurring donations via Stripe subscriptions
- Guest checkout (no account required)
- Stripe fee coverage option
- Dual Stripe mode support (test/live)
- Automatic status updates via webhooks
- Email validation and sanitization
- Terms & Conditions acceptance requirement
- **Automatic reconciliation system:**
  - Hourly cron job polls Stripe for actual transaction status
  - Auto-fixes pending donations stuck due to webhook failures
  - Auto-cancels abandoned checkouts after 2 hours (no Stripe record found)
  - Generates receipts for newly confirmed donations
- **Admin transaction management:**
  - View all donations in SponsorshipTransactionsManager
  - **Multi-select status filter** (defaults to cancelled deselected)
  - Copy Stripe customer ID
  - Open Stripe customer page in dashboard
  - View receipt generation status (generated/pending)
  - Access receipt generation audit logs
  - Delete transactions (only cancelled/test/duplicate - NOT pending)

---

## DONATION HISTORY DISPLAY SYSTEM

The `/donation-history` page and `DonationHistory.tsx` component display user donations by querying the `donation_stripe_transactions` table, which is populated by the `sync-donation-history` edge function.

### Key Tables

| Table | Purpose |
|-------|---------|
| `donation_stripe_transactions` | Combined transactions synced from Stripe (invoices + charges) |
| `active_subscriptions_cache` | Cache of active recurring subscriptions |
| `donation_sync_status` | Tracks sync status per user |

### Edge Function: sync-donation-history

**Location:** `supabase/functions/sync-donation-history/index.ts`

**Auth:** JWT Required (manual sync) or Cron header (scheduled sync)

**Purpose:** Syncs all paid transactions from Stripe to `donation_stripe_transactions` table.

**Processing Flow:**
1. Gets Stripe mode from `app_settings`
2. Collects emails from: `donations`, `sponsorships`, existing cache
3. For each email:
   - Finds Stripe customer
   - Fetches invoices, charges, payment_intents from Stripe
   - **Filters out marketplace purchases** (see below)
   - Creates/updates records in `donation_stripe_transactions`
   - Syncs active subscriptions to `active_subscriptions_cache`

**Marketplace Filtering (CRITICAL):**

Store purchases must be excluded from donation history. Two methods are used:

1. **Metadata Check:** Skip if any metadata source contains `order_id`
2. **Orders Table Check:** Skip if `stripe_payment_intent_id` exists in `orders` table

```typescript
// Load marketplace payment intents to exclude
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

// During processing, skip if match:
if (piId && marketplacePaymentIntentIds.has(piId)) {
  continue; // Skip marketplace purchase
}
```

### Frontend Component: DonationHistory.tsx

**Location:** `src/components/sponsor/DonationHistory.tsx`

**Features:**
- Transaction history table (date, designation, amount, type, status, receipt)
- Active subscriptions display with "Manage Subscriptions" button
- Year-end summary cards with download/email options
- Year filter dropdown
- Stripe mode toggle (admin/owner only)

**Data Query:**
```typescript
const { data: txData } = await supabase
  .from("donation_stripe_transactions")
  .select("*")
  .eq("email", userEmail)
  .eq("stripe_mode", stripeMode)
  .order("transaction_date", { ascending: false });
```

### Designation Logic

- **"General Support"** - General donations (`metadata.type = 'donation'`)
- **"Sponsorship: {BestieName}"** - Bestie sponsorships (matched via `sponsorships.stripe_subscription_id`)

### Full Documentation

See `docs/DONATION_HISTORY_SYSTEM.md` for complete architecture details.

---

## NOT IMPLEMENTED ❌

### Critical

---

## TROUBLESHOOTING

| Issue | Cause | Fix |
|-------|-------|-----|
| **Donations not appearing** | Database constraint blocks 'pending' status | Check constraint allows: 'pending', 'completed', 'active', 'cancelled', 'paused' |
| **Donations stuck at 'pending'** | Webhook failure or database constraint | Reconciliation cron auto-fixes hourly; run manual reconcile if urgent |
| **Donations auto-cancelled incorrectly** | >2h old with no Stripe record | Check Stripe dashboard - if payment exists, investigate webhook issues |
| Webhook not updating status | Missing `type: 'donation'` metadata | Verify metadata in checkout session; reconciliation will fix |
| Can't find donation by email | Email mismatch | Check case sensitivity, trim whitespace |
| Monthly donation stays pending | Webhook didn't fire | Wait for hourly reconciliation or run manual reconcile |
| Wrong Stripe mode | Mode setting incorrect | Check `app_settings.stripe_mode` |
| Guest donation not visible to user | No `donor_id` link | Query by email instead |
| Receipt logs not showing | UI restricted to sponsorships | Check SponsorshipTransactionsManager - should show for both |
| Cancelled donations appearing in list | Status filter includes cancelled | Status filter defaults to cancelled deselected; adjust filter if needed |

**Critical Debugging Steps:**
1. Check database constraint: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'donations'::regclass AND contype = 'c'`
2. Check edge function logs for 'pending' creation
3. Check reconciliation logs for status updates (Admin → Besties → Transactions → Reconcile Now)
4. Verify `stripe_customer_id` is set (required for actions)
5. Check `metadata.type = 'donation'` in Stripe dashboard
6. For auto-cancelled donations: verify Stripe has no matching checkout session/payment

---

## TESTING

### Test One-Time Donation
1. Go to `/support`
2. Select "One-Time" frequency
3. Enter amount ($10)
4. Use test email (e.g., `test@example.com`)
5. Use Stripe test card: `4242 4242 4242 4242`
6. Check database: donation status should be 'completed'

### Test Monthly Donation
1. Select "Monthly" frequency
2. Complete checkout with test card
3. Check database: donation status should be 'active', `stripe_subscription_id` populated
4. Cancel subscription via Stripe dashboard
5. Check database: status should update to 'cancelled'

---

## FUTURE ENHANCEMENTS

- [ ] Implement receipt generation (reuse `send-sponsorship-receipt` logic)
- [ ] Create `/donations` page for donor history
- [ ] Add Stripe Customer Portal integration for subscription management
- [ ] Build admin donation management UI
- [ ] Add donation analytics (total raised, average gift, retention)
- [ ] Implement year-end tax summaries
- [ ] Add email notifications (thank you, receipt, monthly confirmation)
- [ ] Create donation widgets/embeds for external sites
- [ ] Support in-honor/in-memory donations
- [ ] Add recurring donation upgrade prompts

---

---

## ADMIN INTERFACE

**SponsorshipTransactionsManager** (`src/components/admin/SponsorshipTransactionsManager.tsx`)

Displays donations alongside sponsorships with full management capabilities:

**Visible Information:**
- Type badge (yellow "Donation" vs orange "Sponsorship")
- Donor/Sponsor name and email
- Recipient (General Fund vs Bestie name)
- Amount
- Frequency (One-Time vs Monthly)
- Status (Completed, Active, Cancelled, Pending, Paused, Duplicate, Test)
- Stripe mode (Test vs Live)
- Start date / End date
- Receipt status (green checkmark if generated, yellow clock if pending)

**Filters:**
- **Status (Multi-Select):** Checkboxes for each status, defaults to cancelled deselected
  - Options: Active, Scheduled to Cancel, Pending, Completed, Cancelled, Paused, Duplicate, Test
- **Type:** All / Sponsorships / Donations
- **Bestie:** All / Specific bestie (for sponsorships)
- **Frequency:** All / Monthly / One-Time
- **Search:** Donor name, email, bestie name, or subscription ID

**Available Actions:**
- 📄 **View Receipt** - If receipt generated (green FileText icon)
- 🕐 **Receipt Pending** - If no receipt yet (yellow Clock icon, disabled)
- 📋 **View Audit Logs** - Receipt generation logs (FileText icon, works for both donations and sponsorships)
- 📋 **Copy Customer ID** - Copy `stripe_customer_id` to clipboard
- 🔗 **Open Stripe Customer** - Opens customer page in Stripe dashboard (test or live mode)
- 🗑️ **Delete Transaction** - Only for cancelled, test, or duplicate transactions (NOT pending)

**Key Implementation Details:**
```typescript
// Transaction interface includes both donation and sponsorship fields
interface Transaction {
  stripe_customer_id: string | null;  // Used for one-time donations
  stripe_subscription_id: string | null;  // Used for monthly donations/sponsorships
  receipt_number: string | null;
  receipt_generated_at: string | null;
}

// Multi-select status filter - defaults to cancelled excluded
const [filterStatus, setFilterStatus] = useState<string[]>([
  "active", "pending", "paused", "completed", "scheduled_cancel", "duplicate", "test"
]);

// Audit logs work for both types
const loadAuditLogs = async (transactionId: string) => {
  // Loads from sponsorship_receipts table
  // Works for donations too when receipts are generated
};
```

---

## RECONCILIATION SYSTEM

The `reconcile-donations-from-stripe` edge function runs hourly to fix pending donations:

**Strategies (in order):**
1. **Checkout Session ID** (preferred): Retrieve session, expand subscription/payment_intent
2. **Subscription ID** (monthly fallback): Retrieve subscription status directly
3. **Customer Search** (last resort): Search by customer_id + amount + timestamp

**Actions:**
- `activated`: Pending → Active (monthly subscription confirmed in Stripe)
- `completed`: Pending → Completed (one-time payment confirmed in Stripe)
- `auto_cancelled`: Pending → Cancelled (>2 hours old, no Stripe record = abandoned checkout)
- `skipped`: <2 hours old or still processing (leave for webhooks)

**Auto-Cancel Threshold:** 2 hours
- Donations with no matching Stripe record after 2 hours are automatically cancelled
- This prevents abandoned/incomplete checkouts from accumulating forever
- Cancelled records remain in database for audit purposes

**Scheduling:** Hourly cron job at :00

---

**Last Updated:** 2026-01-03 - Added DONATION HISTORY DISPLAY SYSTEM section documenting sync-donation-history, marketplace filtering, and DonationHistory.tsx component
