# DONATION SYSTEM - COMPLETE DOCUMENTATION

## OVERVIEW
General donation system on the Support Us page (`/support`) allowing one-time and monthly recurring donations via Stripe, with automated webhook processing for status updates.

---

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
  5. Inserts 'pending' donation record in database
  6. Returns `{url}` for redirect to Stripe Checkout
- **Success URL:** `/support?donation=success`
- **Cancel URL:** `/support`

**stripe-webhook**
- **Location:** `supabase/functions/stripe-webhook/index.ts`
- **Auth:** Verified via Stripe webhook signature
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
- **Admin transaction management:**
  - View all donations in SponsorshipTransactionsManager
  - Copy Stripe customer ID
  - Open Stripe customer page in dashboard
  - View receipt generation status (generated/pending)
  - Access receipt generation audit logs
  - Delete test transactions

---

## NOT IMPLEMENTED ❌

### Critical
- Automated receipt generation (like sponsorships have) - **Partially implemented: audit logs viewable**
- Donation history page for donors (currently only in admin)
- Ability to update monthly donation amount
- Stripe Customer Portal link for subscription management

### Important
- Year-end tax summaries for donors
- Donation analytics dashboard
- Email notifications for successful donations (welcome, thank you, receipts)

### Nice to Have
- Linking guest donations to accounts on signup
- Multiple payment methods (beyond cards)
- Recurring donation reminders
- Honor/memorial donation dedications
- Matching gift programs

---

## TROUBLESHOOTING

| Issue | Cause | Fix |
|-------|-------|-----|
| **Donations not appearing** | Database constraint blocks 'pending' status | Check constraint allows: 'pending', 'completed', 'active', 'cancelled', 'paused' |
| **Donations stuck at 'pending'** | Database constraint blocks 'completed' status | Same as above - verify constraint |
| Webhook not updating status | Missing `type: 'donation'` metadata | Verify metadata in checkout session |
| Can't find donation by email | Email mismatch | Check case sensitivity, trim whitespace |
| Monthly donation stays pending | Webhook didn't fire | Check Stripe webhook logs |
| Wrong Stripe mode | Mode setting incorrect | Check `app_settings.stripe_mode` |
| Guest donation not visible to user | No `donor_id` link | Query by email instead |
| Receipt logs not showing | UI restricted to sponsorships | Check SponsorshipTransactionsManager - should show for both |

**Critical Debugging Steps:**
1. Check database constraint: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'donations'::regclass AND contype = 'c'`
2. Check edge function logs for 'pending' creation
3. Check webhook logs for 'completed'/'active' update
4. Verify `stripe_customer_id` is set (required for actions)
5. Check `metadata.type = 'donation'` in Stripe dashboard

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
- Status (Completed, Active, Cancelled)
- Stripe mode (Test vs Live)
- Start date / End date
- Receipt status (green checkmark if generated, yellow clock if pending)

**Available Actions:**
- 📄 **View Receipt** - If receipt generated (green FileText icon)
- 🕐 **Receipt Pending** - If no receipt yet (yellow Clock icon, disabled)
- 📋 **View Audit Logs** - Receipt generation logs (FileText icon, works for both donations and sponsorships)
- 📋 **Copy Customer ID** - Copy `stripe_customer_id` to clipboard
- 🔗 **Open Stripe Customer** - Opens customer page in Stripe dashboard (test or live mode)
- 🗑️ **Delete Test Transaction** - Only for test mode transactions

**Key Implementation Details:**
```typescript
// Transaction interface includes both donation and sponsorship fields
interface Transaction {
  stripe_customer_id: string | null;  // Used for one-time donations
  stripe_subscription_id: string | null;  // Used for monthly donations/sponsorships
  receipt_number: string | null;
  receipt_generated_at: string | null;
}

// Audit logs work for both types
const loadAuditLogs = async (transactionId: string) => {
  // Loads from sponsorship_receipts table
  // Works for donations too when receipts are generated
};
```

---

**Last Updated:** 2025-10-22 - After fixing database constraint and adding full admin UI support for donations
