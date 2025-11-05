# Stripe Webhook Configuration Guide

## Critical Issue: Missing Webhook Configuration

**Problem:** Donations succeed in Stripe but remain "pending" in the database, and no receipts are sent.

**Root Cause:** Stripe webhooks are not configured to notify our system when payments complete.

---

## Solution: Configure Stripe Webhooks

### Step 1: Get Your Webhook URL

Your webhook endpoint URL is:
```
https://nbvijawmjkycyweioglk.supabase.co/functions/v1/stripe-webhook
```

### Step 2: Configure in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Log in to [dashboard.stripe.com](https://dashboard.stripe.com)
   - Switch to the correct mode (Test or Live) in the top-right toggle

2. **Add Webhook Endpoint**
   - Navigate to: **Developers** → **Webhooks**
   - Click **"Add endpoint"**
   - Enter webhook URL: `https://nbvijawmjkycyweioglk.supabase.co/functions/v1/stripe-webhook`

3. **Select Events to Listen For**
   You MUST select these events:
   - ✅ `checkout.session.completed` (for one-time and subscription donations)
   - ✅ `customer.subscription.updated` (for subscription changes)
   - ✅ `customer.subscription.deleted` (for cancellations)
   - ✅ `invoice.payment_succeeded` (for recurring monthly payments)

4. **Save and Get Signing Secret**
   - Click **"Add endpoint"**
   - Copy the **Signing secret** (starts with `whsec_...`)

### Step 3: Configure Signing Secret

The signing secret MUST be added to your Lovable Cloud secrets:

**For Live Mode:**
- Secret name: `STRIPE_WEBHOOK_SECRET_LIVE`
- Value: Your signing secret from Stripe Live mode (e.g., `whsec_xxx`)

**For Test Mode:**
- Secret name: `STRIPE_WEBHOOK_SECRET_TEST`
- Value: Your signing secret from Stripe Test mode (e.g., `whsec_xxx`)

---

## Testing the Webhook

### Test a Webhook Manually

1. In Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select event: `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check that response is **200 OK**

### Test with Real Payment

1. Make a test donation on your site
2. Check Stripe Dashboard → Developers → Webhooks → [your endpoint]
3. Verify the `checkout.session.completed` event was sent
4. Verify response was **200 OK**
5. Check your database: donation status should be "completed"
6. Check email: receipt should have been sent

---

## Troubleshooting

### Webhook Shows Failed (Non-200 Response)

**Check edge function logs:**
```
Admin → Testing → Edge Function Logs → stripe-webhook
```

Look for error messages indicating:
- Signature verification failure → Check your signing secret
- Database errors → Check RLS policies and table permissions
- Email errors → Check RESEND_API_KEY is configured

### Webhook Not Receiving Events

**Verify:**
1. URL is exactly: `https://nbvijawmjkycyweioglk.supabase.co/functions/v1/stripe-webhook`
2. Events are selected: `checkout.session.completed`, `customer.subscription.updated`, etc.
3. Webhook is in the correct mode (Test vs Live) matching your donations

### Status Still Pending After Webhook

**Check database query:**
```sql
SELECT * FROM donations 
WHERE donor_email = '[customer-email]'
ORDER BY created_at DESC;
```

If status is still "pending":
1. Check edge function logs for errors
2. Verify webhook delivered with 200 OK
3. Check that donation amount matches Stripe amount exactly
4. Ensure `stripe_mode` field matches webhook mode

---

## Manual Recovery Process

If a donation was completed in Stripe but missed by webhook:

1. **Update donation status:**
```sql
UPDATE donations 
SET status = 'completed' 
WHERE id = '[donation-id]' 
AND status = 'pending';
```

2. **Create receipt record:**
```sql
INSERT INTO sponsorship_receipts (
  sponsor_email, sponsor_name, bestie_name, amount, frequency,
  transaction_id, transaction_date, receipt_number, tax_year, stripe_mode
) VALUES (
  '[email]', '[name]', 'General Support', [amount], 'one-time',
  '[stripe-payment-intent-id]', NOW(), 'RCP-' || FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT,
  EXTRACT(YEAR FROM NOW()), 'live'
);
```

3. **Send receipt email:**
Use Admin → Besties → Receipts tab → Find receipt → Resend

---

## Critical Notes

⚠️ **Two Webhook Endpoints Required:**
- One for **Test mode** (uses `STRIPE_WEBHOOK_SECRET_TEST`)
- One for **Live mode** (uses `STRIPE_WEBHOOK_SECRET_LIVE`)

⚠️ **Webhook Verification:**
The webhook handler automatically tries LIVE secret first, then TEST secret. This prevents misconfiguration errors.

⚠️ **Database Matching:**
Webhooks match donations by:
- Customer email (exact match)
- Amount (must match exactly)
- Frequency ("one-time" or "monthly")
- Status ("pending" → updates to "completed" or "active")

If any of these don't match, the webhook will fail silently.

---

## Related Documentation

- [DONATION_SYSTEM.md](./DONATION_SYSTEM.md) - Full donation system architecture
- [DONATION_DEBUGGING_LESSONS.md](./DONATION_DEBUGGING_LESSONS.md) - Troubleshooting guide
- [SPONSORSHIP_RECEIPT_SYSTEM_COMPLETE.md](./SPONSORSHIP_RECEIPT_SYSTEM_COMPLETE.md) - Receipt system details
