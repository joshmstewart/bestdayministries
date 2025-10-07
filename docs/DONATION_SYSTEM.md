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
- `status` (text) - 'pending', 'completed' (one-time), 'active' (monthly), 'cancelled'
- `stripe_customer_id` (text, nullable) - Stripe customer ID
- `stripe_subscription_id` (text, nullable) - For monthly donations
- `stripe_mode` (text) - 'test' or 'live'
- `started_at`, `ended_at`, `created_at`, `updated_at` (timestamps)

**RLS Policies:**
- Admins can view all donations
- Donors can view their own donations (by `donor_id` OR by matching email from `auth.users`)
- Public can INSERT (handled by edge function, not direct client calls)

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
pending → (checkout.session.completed) → completed
```

### Monthly Donations
```
pending → (checkout.session.completed) → active
active → (customer.subscription.updated with cancel_at_period_end) → active (with ended_at set)
active → (customer.subscription.deleted) → cancelled
```

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

---

## NOT IMPLEMENTED ❌

### Critical
- Automated receipt generation (like sponsorships have)
- Donation history page for donors
- Ability to update monthly donation amount
- Stripe Customer Portal link for subscription management

### Important
- Year-end tax summaries for donors
- Admin view of all donations
- Donation analytics dashboard
- Email notifications for successful donations

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
| Webhook not updating status | Missing `type: 'donation'` metadata | Verify metadata in checkout session |
| Can't find donation by email | Email mismatch | Check case sensitivity, trim whitespace |
| Monthly donation stays pending | Webhook didn't fire | Check Stripe webhook logs |
| Wrong Stripe mode | Mode setting incorrect | Check `app_settings.stripe_mode` |
| Guest donation not visible to user | No `donor_id` link | Query by email instead |

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

**Last Updated:** After implementing webhook automation for donation status updates
