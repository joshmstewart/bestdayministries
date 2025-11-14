# DONATION RECOVERY SYSTEM

## Overview
Comprehensive system for recovering missing donations from Stripe when webhooks fail or database constraints prevent record creation. Generates donation records, receipts, and sends notification emails.

**Date Created:** 2025-11-14  
**Purpose:** Recover Oct 7-22 missing donations and provide ongoing recovery capability

---

## Components

### Edge Function: `recover-all-missing-donations` (RECOMMENDED)
**Location:** `supabase/functions/recover-all-missing-donations/index.ts`

**Purpose:** Automatically recover ALL missing donations from orphaned receipts by fetching Stripe data using any transaction ID format.

**Authentication:** Requires admin or owner role

**Input:**
```typescript
{
  mode?: "live" | "test"  // Stripe mode (defaults to "live")
}
```

**Process:**
1. Finds all orphaned receipts (receipts with no donation record)
2. Retrieves Stripe data for each receipt using transaction_id
3. Handles multiple Stripe ID formats:
   - `cs_*` - Checkout Sessions
   - `pi_*` - Payment Intents
   - `in_*` - Invoices  
   - `ch_*` - Charges
4. Looks up user profile by email
5. Creates donation record with correct constraint handling
6. Links receipt to donation

**Critical Constraint Handling:**
The donations table has a `donor_identifier_check` constraint that requires EITHER:
- `donor_id` IS NOT NULL AND `donor_email` IS NULL (registered user)
- `donor_id` IS NULL AND `donor_email` IS NOT NULL (guest donor)

**NEVER both set, NEVER both null, and empty strings must be converted to null.**

**Output:**
```typescript
{
  success: boolean;
  summary: {
    total: number;           // Total receipts processed
    created: number;         // Donations created
    alreadyExists: number;   // Receipts already linked
    errors: number;          // Failed recoveries
  };
  results: RecoveryResult[]; // Detailed per-receipt results
}
```

---

### Edge Function: `recover-missing-donations` (LEGACY - CSV-based)
**Location:** `supabase/functions/recover-missing-donations/index.ts`

**Purpose:** Process CSV transaction data from Stripe, create missing donation records, generate receipts, and send emails.

**Authentication:** Requires admin or owner role

**Input:**
```typescript
{
  transactions: TransactionData[],  // Array of Stripe transaction data
  mode: "live" | "test"              // Stripe mode (defaults to "live")
}

interface TransactionData {
  customer_id: string;    // Stripe customer ID
  amount: number;         // Amount in cents
  created: string;        // ISO timestamp
  currency: string;       // Currency code (e.g., "usd")
  description?: string;   // Optional description
}
```

**Output:**
```typescript
{
  success: boolean;
  summary: {
    total: number;              // Total transactions processed
    successful: number;         // Fully successful (donation + receipt + email)
    donationsCreated: number;   // Donation records created
    receiptsGenerated: number;  // Receipt records created
    receiptsSent: number;       // Emails sent successfully
    failed: number;             // Failed transactions
  };
  results: RecoveryResult[];    // Detailed per-transaction results
}

interface RecoveryResult {
  customerId: string;
  email: string | null;
  amount: number;
  donationCreated: boolean;
  receiptGenerated: boolean;
  receiptSent: boolean;
  error?: string;
}
```

---

## Recovery Process (5 Phases)

### Phase 1: Identify Missing Customers
1. Receive Stripe customer IDs from CSV data
2. Call `stripe.customers.retrieve()` for each customer
3. Extract email address and validate customer exists
4. Skip deleted customers or customers without emails

**Logs:**
- "Processing customer" with customer ID
- "Customer fetched" with email

### Phase 2: Create Missing Donation Records
1. Check if donation already exists (avoid duplicates)
2. Check if user profile exists (link by email)
3. Determine if subscription or one-time payment
4. Insert into `donations` table with:
   - `donor_id`: User ID if profile exists, else null
   - `donor_email`: ALWAYS set (critical for recovery)
   - `amount`: Base amount without fees (dollars)
   - `amount_charged`: Actual charged amount (dollars)
   - `frequency`: "monthly" or "one-time"
   - `status`: "active" (subscriptions) or "completed" (one-time)
   - `stripe_customer_id`: Customer ID
   - `stripe_subscription_id`: Subscription ID if monthly
   - `stripe_mode`: "live" or "test"
   - `created_at`: Original transaction timestamp
   - `started_at`: Same as created_at
   - `ended_at`: Null for subscriptions, created_at for one-time

**Logs:**
- "Donation created" with donation ID

### Phase 3: Generate and Send Receipts
1. Get current year for tax receipt
2. Fetch `receipt_settings` for organization info
3. Generate unique receipt number (format: YYYY-NNNNNN)
4. Insert into `sponsorship_receipts` table:
   - `transaction_id`: `donation_{donation_id}`
   - `user_id`: User ID if exists, else null
   - `sponsor_email`: Customer email
   - `amount`: Charged amount (dollars)
   - `organization_name`: From settings
   - `organization_ein`: From settings
   - `receipt_number`: Generated number
   - `tax_year`: Current year
   - `status`: "generated"
   - `generated_at`: Current timestamp
5. Invoke `send-sponsorship-receipt` function
6. Handle email failures gracefully (receipt still created)

**Logs:**
- "Receipt created" with receipt ID
- "Receipt sent" with receipt ID (if successful)

### Phase 4: Error Handling
Common errors and handling:
- **Customer deleted:** Skip transaction, log error
- **No email found:** Skip transaction, cannot send receipt
- **Donation exists:** Skip to avoid duplicate
- **Receipt generation failed:** Log error, no email sent
- **Email send failed:** Receipt still created, error logged

### Phase 5: Summary Report
Generate comprehensive report with:
- Total transactions processed
- Success counts for each step
- Detailed per-transaction results
- Error messages for failed transactions

---

## Frontend Component: `DonationRecoveryManager`
**Location:** `src/components/admin/DonationRecoveryManager.tsx`

**Features:**
1. **CSV Data Input:** Textarea for pasting Stripe CSV export
2. **CSV Parser:** Automatically parses CSV format with headers
3. **Recovery Trigger:** Button to start recovery process
4. **Loading State:** Shows spinner during processing
5. **Summary Display:** Visual grid showing key metrics
6. **Detailed Results:** List of all processed transactions with status indicators

**CSV Format Expected:**
```csv
Customer ID,Amount,Created,Currency,Description
cus_abc123,5000,2025-10-15T10:30:00Z,usd,Monthly donation
cus_def456,10000,2025-10-15T11:00:00Z,usd,One-time donation
```

**Admin Access:**
- Navigate to: Admin → Besties → Recovery Tool tab
- Only accessible to admin and owner roles

---

## Use Cases

### 1. Oct 7-22 Missing Donations
**Problem:** Database constraint prevented donations from being recorded

**Solution:**
1. Export Stripe transactions from Oct 7-22
2. Paste CSV into Recovery Tool
3. Run recovery process
4. Verify 10 missing donations recovered
5. Confirm all receipts generated and sent

**Expected Results:**
- 10 donation records created
- 10 receipts generated
- 10 emails sent to donors

### 2. Post-Oct 22 Null Email Issue
**Problem:** Nov 6 donation has null email (customer: cus_TNFJbLMJwdJmyP)

**Solution:**
1. Query Stripe directly for customer details
2. Update donation record with email if found
3. Generate and send missing receipt

### 3. Ongoing Recovery
**Problem:** Webhook failures continue to occur

**Solution:**
1. Set up daily/weekly Stripe export check
2. Compare Stripe data with database records
3. Use Recovery Tool to backfill any gaps
4. Monitor `stripe_webhook_logs` for failures

---

## Database Tables Affected

### 1. `donations`
**Fields Created:**
- All standard donation fields
- `donor_email` ALWAYS populated (critical)
- `donor_id` populated if user exists
- `created_at` set to original transaction date
- `stripe_customer_id` links to Stripe

### 2. `sponsorship_receipts`
**Fields Created:**
- `transaction_id` format: `donation_{id}`
- `sponsorship_id` is null (donations use transaction_id)
- `user_id` if user exists, else null
- `sponsor_email` ALWAYS populated
- Unique receipt number generated

### 3. `email_audit_log` (via `send-sponsorship-receipt`)
**Fields Created:**
- Audit trail of receipt emails sent
- Links to receipt record
- Tracks delivery status

---

## Critical Database Constraint: donor_identifier_check

### The Constraint
The `donations` table has a CHECK constraint that enforces exclusive identifier usage:

```sql
CONSTRAINT donor_identifier_check CHECK (
  (donor_id IS NOT NULL AND donor_email IS NULL) OR 
  (donor_id IS NULL AND donor_email IS NOT NULL)
)
```

### Rules
1. **EITHER donor_id OR donor_email must be set** (not both, not neither)
2. **Registered users:** Set only `donor_id`, `donor_email` MUST be NULL
3. **Guest donors:** Set only `donor_email`, `donor_id` MUST be NULL
4. **Empty strings are NOT NULL** - must convert empty strings to actual NULL values

### Common Errors
**Error:** "new row for relation 'donations' violates check constraint 'donor_identifier_check'"

**Causes:**
- Both `donor_id` and `donor_email` are set (most common)
- Both are NULL
- `donor_email` is empty string instead of NULL

### Recovery Implementation
```typescript
// CORRECT pattern from recover-all-missing-donations
const { data: profileData } = customerEmail && customerEmail.trim()
  ? await supabase.from('profiles').select('id').eq('email', customerEmail).maybeSingle()
  : { data: null };

const donationData = {
  donor_email: profileData?.id ? null : (customerEmail?.trim() || null),
  donor_id: profileData?.id || null,
  // ... other fields
};
```

**Key Points:**
- Check if user exists in profiles table
- If profile found: set only `donor_id`, explicitly set `donor_email` to NULL
- If no profile: set only `donor_email` (trimmed or NULL), explicitly set `donor_id` to NULL
- Always use `|| null` and `? null :` patterns to ensure proper NULL handling

---

## Error Scenarios and Recovery

### Scenario 1: Customer Has No Email
**Error:** "No email found for customer"

**Impact:**
- Donation cannot be created (email required)
- No receipt can be generated
- Transaction skipped

**Manual Recovery:**
1. Contact customer via Stripe
2. Update customer email in Stripe
3. Re-run recovery for this transaction

### Scenario 2: Donation Already Exists
**Error:** "Donation already exists"

**Impact:**
- Transaction skipped (prevents duplicates)
- No receipt generated (already exists)

**Manual Recovery:**
1. Check if receipt exists
2. If no receipt, manually generate via admin UI
3. Verify email was sent

### Scenario 3: Receipt Email Fails
**Error:** "Receipt created but email failed: [reason]"

**Impact:**
- Donation created ✓
- Receipt record created ✓
- Email not sent ✗

**Manual Recovery:**
1. Find receipt in admin UI
2. Use "Resend Receipt" button
3. Verify email delivery in `email_audit_log`

### Scenario 4: Receipt Settings Missing
**Error:** "Receipt settings not configured"

**Impact:**
- Donation created ✓
- Receipt cannot be generated ✗
- No email sent ✗

**Manual Recovery:**
1. Configure receipt settings (Admin → Besties → Receipt Settings)
2. Re-run recovery for these transactions

---

## Monitoring and Alerts

### Daily Checks
1. **Stripe Dashboard:** Review completed payments
2. **Database Query:**
```sql
SELECT COUNT(*) FROM donations 
WHERE DATE(created_at) = CURRENT_DATE;
```
3. **Compare:** Stripe count vs database count

### Weekly Audit
1. **Webhook Logs:** Check for failed webhooks
```sql
SELECT * FROM stripe_webhook_logs 
WHERE processing_status = 'failed' 
  AND created_at > NOW() - INTERVAL '7 days';
```
2. **Missing Receipts:**
```sql
SELECT d.* FROM donations d
LEFT JOIN sponsorship_receipts sr 
  ON sr.transaction_id = CONCAT('donation_', d.id)
WHERE sr.id IS NULL 
  AND d.status IN ('completed', 'active');
```

### Alerts to Set Up
- Webhook failure rate > 5%
- Donations created without receipts
- Email send failures > 10%

---

## Best Practices

### 1. Before Running Recovery
- ✅ Export clean CSV from Stripe
- ✅ Verify transactions are truly missing
- ✅ Check receipt settings are configured
- ✅ Test with 1-2 transactions first
- ✅ Backup database (if possible)

### 2. During Recovery
- ✅ Monitor logs in real-time
- ✅ Watch for error patterns
- ✅ Verify emails being sent
- ✅ Check Resend dashboard for delivery

### 3. After Recovery
- ✅ Verify donation records created
- ✅ Confirm receipts generated
- ✅ Check email audit logs
- ✅ Contact donors if emails failed
- ✅ Document issues encountered

---

## Testing

### Test Data Format
```csv
Customer ID,Amount,Created,Currency,Description
cus_test123,1000,2025-11-14T10:00:00Z,usd,Test donation
```

### Test Process
1. Create test customer in Stripe test mode
2. Generate CSV with test customer
3. Run recovery with `mode: "test"`
4. Verify donation created in test mode
5. Verify receipt generated
6. Check test email delivered

### Verification Queries
```sql
-- Check donation created
SELECT * FROM donations 
WHERE donor_email = 'test@example.com' 
  AND stripe_mode = 'test';

-- Check receipt created
SELECT * FROM sponsorship_receipts 
WHERE sponsor_email = 'test@example.com';

-- Check email sent
SELECT * FROM email_audit_log 
WHERE recipient = 'test@example.com' 
  AND event_type = 'sponsorship_receipt';
```

---

## Future Enhancements

### Planned Features
1. **Automated Scheduled Recovery:** Daily cron job to auto-detect and recover
2. **Stripe Webhook Monitoring:** Alert on webhook failures
3. **Batch Receipt Resend:** Bulk resend failed receipts
4. **CSV Upload:** Direct file upload instead of paste
5. **Dry Run Mode:** Preview what would be recovered without making changes

### Integration Opportunities
1. Link with monitoring dashboard
2. Auto-generate recovery reports
3. Integrate with admin notification system
4. Create audit trail for all recoveries

---

## Related Documentation
- `DONATION_DEBUGGING_LESSONS.md` - Root cause analysis
- `DONATION_SYSTEM.md` - Overall donation system
- `WEBHOOK_CONFIGURATION_GUIDE.md` - Preventing webhook failures
- `SPONSORSHIP_RECEIPT_SYSTEM_COMPLETE.md` - Receipt generation details

---

## Troubleshooting

### Recovery Tool Not Appearing
**Cause:** Not logged in as admin/owner

**Fix:** Verify role with query:
```sql
SELECT role FROM user_roles WHERE user_id = auth.uid();
```

### CSV Parse Error
**Cause:** Incorrect CSV format

**Fix:** Ensure headers exactly match:
- Customer ID
- Amount
- Created
- Currency

### All Recoveries Failing
**Cause:** Stripe API key not configured

**Fix:** Verify secrets in Lovable Cloud:
- `STRIPE_SECRET_KEY` (live)
- `STRIPE_SECRET_KEY_TEST` (test)

### Emails Not Sending
**Cause:** Resend API key missing or invalid

**Fix:** Check `RESEND_API_KEY` in secrets

---

**Last Updated:** 2025-11-14  
**Status:** Active  
**Maintainer:** Admin Team
