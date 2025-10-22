# DONATION SYSTEM DEBUGGING LESSONS

## CRITICAL ISSUE: DATABASE CONSTRAINT MISMATCH

### The Problem
On 2025-10-22, we discovered that **all donations were failing silently** due to a database constraint mismatch between what the code expected and what the database allowed.

### Root Cause
The `donations_status_check` constraint was initially created with:
```sql
CHECK (status IN ('active', 'cancelled', 'paused'))
```

However, the code was attempting to:
1. **Edge function** (`create-donation-checkout`) → Insert with `status = 'pending'`
2. **Webhook** (`stripe-webhook`) → Update one-time donations to `status = 'completed'`

**Result:** All donation INSERT operations failed silently because 'pending' was not in the allowed values.

### The Fix
```sql
ALTER TABLE donations DROP CONSTRAINT donations_status_check;
ALTER TABLE donations ADD CONSTRAINT donations_status_check 
  CHECK (status IN ('pending', 'completed', 'active', 'cancelled', 'paused'));
```

### How This Was Missed
- Database constraints operate silently - no errors surfaced to logs
- Edge function appeared to work (returned 200 status)
- Stripe checkout completed successfully
- Only discovered when checking if donations existed in database

---

## DONATION STATUS FLOW (CORRECTED)

### One-Time Donations
```
1. User submits form → create-donation-checkout
   INSERT INTO donations (status = 'pending', stripe_customer_id = [id])
   
2. User completes Stripe payment → checkout.session.completed webhook
   UPDATE donations SET status = 'completed'
   WHERE donor_email = [email] 
     AND amount = [amount] 
     AND frequency = 'one-time' 
     AND status = 'pending'
```

### Monthly Donations
```
1. User submits form → create-donation-checkout
   INSERT INTO donations (status = 'pending', stripe_customer_id = [id])
   
2. User completes Stripe payment → checkout.session.completed webhook
   UPDATE donations SET status = 'active', stripe_subscription_id = [sub_id]
   WHERE donor_email = [email] 
     AND amount = [amount] 
     AND frequency = 'monthly' 
     AND status = 'pending'

3. Subscription lifecycle → customer.subscription.updated webhook
   - Active: status = 'active', ended_at = NULL
   - Scheduled cancel: status = 'active', ended_at = [cancel_at]
   - Cancelled: status = 'cancelled', ended_at = NOW()

4. Subscription deleted → customer.subscription.deleted webhook
   UPDATE donations SET status = 'cancelled', ended_at = NOW()
```

---

## KEY FIELD DIFFERENCES: DONATIONS vs SPONSORSHIPS

| Field | One-Time Donation | Monthly Donation | Sponsorship |
|-------|-------------------|------------------|-------------|
| `stripe_customer_id` | ✅ Always set | ✅ Always set | ✅ Always set |
| `stripe_subscription_id` | ❌ NULL | ✅ Set on completion | ✅ Set on completion |
| `metadata.type` | `'donation'` | `'donation'` | Not used |
| `metadata.bestie_id` | Not used | Not used | ✅ Always set |
| Final status (successful) | `completed` | `active` | `active` |

**Why This Matters:**
- Admin UI uses `stripe_customer_id` to show customer links for one-time donations
- Admin UI uses `stripe_subscription_id` to show subscription links for monthly donations/sponsorships
- Webhook uses `metadata.type` to distinguish donation events from sponsorship events

---

## ADMIN UI UPDATES

### SponsorshipTransactionsManager
Previously, the admin UI was primarily designed for sponsorships. We made these critical updates:

**Transaction Interface Extended:**
```typescript
interface Transaction {
  // ... existing fields
  stripe_customer_id: string | null;  // Added for one-time donations
  receipt_number: string | null;      // Added for receipt tracking
  receipt_generated_at: string | null; // Added for receipt tracking
}
```

**Receipt Status Indicators:**
- ✅ Green `FileText` icon → Receipt generated (clickable to view)
- 🕐 Yellow `Clock` icon → No receipt yet (disabled, for active/completed transactions)

**Actions Now Available for Donations:**
1. **Copy Customer ID** - `stripe_customer_id` to clipboard
2. **Open Stripe Customer** - Opens customer page in Stripe Dashboard (respects test/live mode)
3. **View Audit Logs** - Receipt generation logs (previously restricted to sponsorships only)
4. **Delete Test Transaction** - Only for test mode transactions

**Critical Code Change:**
```typescript
// BEFORE: Audit logs restricted to sponsorships
{transaction.transaction_type === 'sponsorship' && (
  <Button onClick={() => loadAuditLogs(transaction.id)}>
    <FileText className="w-4 h-4" />
  </Button>
)}

// AFTER: Audit logs available for both
<Button onClick={() => loadAuditLogs(transaction.id)}>
  <FileText className="w-4 h-4" />
</Button>
```

---

## DEBUGGING CHECKLIST

When donations aren't working, check in this order:

### 1. Database Constraint
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'donations'::regclass AND contype = 'c';
```
**Must include:** 'pending', 'completed', 'active', 'cancelled', 'paused'

### 2. Edge Function Logs
Check if donation record was created:
```sql
SELECT * FROM donations 
WHERE donor_email = '[test-email]' 
ORDER BY created_at DESC LIMIT 5;
```
**Expected:** status = 'pending', stripe_customer_id populated

### 3. Webhook Logs
Check Stripe webhook delivery:
- Go to Stripe Dashboard → Developers → Webhooks
- Find `checkout.session.completed` event
- Verify `metadata.type = 'donation'`
- Check response was 200 OK

### 4. Database Update
```sql
SELECT * FROM donations 
WHERE donor_email = '[test-email]' 
AND status IN ('completed', 'active');
```
**Expected:** Status updated by webhook

### 5. Admin UI Display
- Go to Admin → Besties → Transactions tab
- Search for donor email
- **Expected:** Shows donation with actions (copy customer ID, open Stripe)

---

## RECEIPT GENERATION

### Current Status
Donations **do not** automatically generate receipts like sponsorships do.

### What Works
- Receipt audit logs are viewable for donations (if receipts were generated)
- UI shows receipt status (green checkmark or yellow clock)

### What's Missing
- No `send-sponsorship-receipt` call for donations
- No receipt records created in `sponsorship_receipts` table
- No email delivery of receipts to donors

### Future Implementation
To add receipt generation for donations:
1. Call `send-sponsorship-receipt` edge function after webhook confirms payment
2. Handle both one-time and monthly receipts
3. Store in `sponsorship_receipts` table (or create `donation_receipts` table)
4. Update admin UI to generate receipts on-demand

---

## LESSONS LEARNED

### 1. Always Verify Database Constraints Match Code
- Don't assume constraints from migration files are correct
- Query actual database constraints during debugging
- Test all status transitions end-to-end

### 2. Silent Failures Are Dangerous
- Database constraint violations can fail silently
- Always check actual data in database, not just logs
- Implement better error surfacing in edge functions

### 3. Document Status Flows Completely
- Every status value must be documented
- Every transition must be mapped to a webhook event
- Include constraint requirements in documentation

### 4. Feature Parity Requires Intentional Design
- Donations and sponsorships share many similarities
- UI components should handle both unless there's a specific reason not to
- Document differences explicitly (like metadata fields)

### 5. Test With Real Data Flow
- Don't just test edge function responses
- Verify database records are created correctly
- Test webhook updates actually work
- Check admin UI displays correctly

---

**Date:** 2025-10-22  
**Issue Discovered:** Donations not appearing in database  
**Root Cause:** Database constraint too restrictive  
**Impact:** Complete donation system failure (silent)  
**Resolution:** Updated constraint + documented properly
