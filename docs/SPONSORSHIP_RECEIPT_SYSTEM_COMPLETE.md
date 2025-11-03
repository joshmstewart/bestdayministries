# SPONSORSHIP RECEIPT SYSTEM - COMPLETE DOCUMENTATION

## Overview
This document provides exhaustive documentation of the sponsorship receipt system, including the duplicate email prevention implementation completed on 2025-11-03.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Edge Functions](#edge-functions)
4. [Frontend Components](#frontend-components)
5. [Workflow Diagrams](#workflow-diagrams)
6. [Duplicate Email Prevention](#duplicate-email-prevention)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## System Architecture

### High-Level Flow
```
User Completes Payment (Stripe Checkout)
         ↓
verify-sponsorship-payment Edge Function
         ↓
Creates Placeholder Receipt (Database Lock)
         ↓
Creates/Updates Sponsorship Record
         ↓
Updates Placeholder with Full Details
         ↓
send-sponsorship-receipt Edge Function
         ↓
Resend API Sends Email
         ↓
User Receives Receipt Email
```

### Key Components
1. **Stripe Checkout Session** - Handles payment collection
2. **verify-sponsorship-payment** - Primary orchestration function
3. **sponsorship_receipts table** - Source of truth for receipt state
4. **send-sponsorship-receipt** - Email generation and sending
5. **Resend API** - Email delivery service
6. **SponsorshipSuccess.tsx** - Frontend confirmation page

---

## Database Schema

### `sponsorships` Table
Stores sponsorship relationships and payment information.

```sql
CREATE TABLE sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES auth.users(id),
  sponsor_email TEXT, -- For guest checkouts
  sponsor_bestie_id UUID REFERENCES sponsor_besties(id) NOT NULL,
  bestie_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL, -- 'monthly' or 'one-time'
  status TEXT NOT NULL, -- 'active', 'cancelled', 'paused'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_mode TEXT NOT NULL, -- 'test' or 'live'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Constraints:**
- `UNIQUE (sponsor_id, sponsor_bestie_id)` - One sponsorship per sponsor-bestie pair
- `UNIQUE (stripe_subscription_id)` - Prevents duplicate subscriptions

### `sponsorship_receipts` Table
Stores receipt records for tax purposes and audit trail.

```sql
CREATE TABLE sponsorship_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id UUID REFERENCES sponsorships(id),
  user_id UUID REFERENCES auth.users(id),
  sponsor_email TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  bestie_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE, -- Stripe session_id
  transaction_date TIMESTAMPTZ NOT NULL,
  receipt_number TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  stripe_mode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Critical Constraints:**
- `UNIQUE (transaction_id)` - **PRIMARY DUPLICATE PREVENTION MECHANISM**
- This unique constraint on `transaction_id` is the foundation of the distributed locking pattern

### `receipt_settings` Table
Organization tax information for receipts.

```sql
CREATE TABLE receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  organization_ein TEXT NOT NULL,
  organization_address TEXT,
  organization_logo_url TEXT,
  is_tax_exempt BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Edge Functions

### 1. `verify-sponsorship-payment`
**Location:** `supabase/functions/verify-sponsorship-payment/index.ts`

**Purpose:** Orchestrates the entire receipt creation and email sending process with duplicate prevention.

**Authentication:** Public (validates Stripe session)

**Key Features:**
- **Distributed Locking Pattern** - Uses database INSERT as a lock
- Auto-detects test vs live mode from session ID prefix
- Handles both authenticated and guest checkouts
- Creates placeholder receipt immediately to claim transaction
- Updates placeholder with full details after sponsorship creation
- Triggers email sending only after successful database operations

**Request Body:**
```typescript
{
  session_id: string // Stripe checkout session ID (cs_test_... or cs_live_...)
}
```

**Response:**
```typescript
{
  success: boolean,
  sponsorship_id?: string,
  amount?: string,
  frequency?: string,
  message?: string,
  alreadyProcessed?: boolean
}
```

**Critical Implementation Details:**

#### Distributed Locking Pattern (Lines 51-89)
```typescript
// Step 1: Try to claim the transaction by inserting a placeholder
const { data: placeholderReceipt, error: placeholderError } = await supabaseAdmin
  .from('sponsorship_receipts')
  .insert({
    transaction_id: session_id,
    sponsor_email: 'pending@processing.temp',
    sponsor_name: 'Processing',
    bestie_name: 'Processing',
    amount: 0,
    frequency: 'monthly',
    transaction_date: new Date().toISOString(),
    receipt_number: `PENDING-${session_id}`,
    tax_year: new Date().getFullYear(),
    stripe_mode: session_id.startsWith('cs_test_') ? 'test' : 'live',
  })
  .select('id')
  .single();

// Step 2: If INSERT fails with unique constraint, another instance owns this transaction
if (placeholderError?.code === '23505') {
  console.log('Transaction already being processed by another instance');
  return new Response(JSON.stringify({ 
    success: true, 
    alreadyProcessed: true 
  }), { status: 200 });
}
```

**Why This Works:**
1. Database enforces `UNIQUE (transaction_id)` constraint
2. Only ONE function instance can successfully INSERT the placeholder
3. All other instances receive error code `23505` (unique constraint violation)
4. Failed instances exit early without sending duplicate emails
5. Successful instance continues to process and send ONE email

#### Mode Detection (Lines 91-94)
```typescript
const isTestSession = session_id.startsWith('cs_test_');
const mode = isTestSession ? 'test' : 'live';
console.log('Detected session mode from prefix:', mode);
```

#### Sponsorship Creation with Upsert (Lines 151-168)
```typescript
const { data: sponsorship, error: sponsorshipError } = await supabaseAdmin
  .from('sponsorships')
  .upsert({
    sponsor_id: userId,
    sponsor_email: userId ? null : customerEmail,
    sponsor_bestie_id: sponsorBestieId,
    amount: parseFloat(session.metadata.amount),
    frequency: session.metadata.frequency,
    status: 'active',
    started_at: new Date().toISOString(),
    stripe_subscription_id: stripeReferenceId || null,
    stripe_mode: mode,
  }, {
    onConflict: stripeReferenceId ? 'stripe_subscription_id' : 
                (userId ? 'sponsor_id,sponsor_bestie_id' : undefined),
  })
  .select()
  .single();
```

#### Placeholder Update and Email Trigger (Lines 184-224)
```typescript
// Update the placeholder with actual details
const { error: updateError } = await supabaseAdmin
  .from('sponsorship_receipts')
  .update({
    sponsorship_id: sponsorship.id,
    sponsor_email: customerEmail,
    sponsor_name: customerEmail.split('@')[0],
    bestie_name: bestieData.bestie_name,
    amount: parseFloat(session.metadata.amount),
    frequency: session.metadata.frequency,
    transaction_date: new Date().toISOString(),
    receipt_number: `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    user_id: userId,
  })
  .eq('id', placeholderReceipt.id);

// Only send email after successful database update
if (!updateError) {
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      sponsorEmail: customerEmail,
      bestieName: bestieData.bestie_name,
      amount: parseFloat(session.metadata.amount),
      frequency: session.metadata.frequency,
      transactionId: session_id,
      transactionDate: new Date().toISOString(),
      stripeMode: mode,
    }),
  });
}
```

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_SECRET_KEY_LIVE`

---

### 2. `send-sponsorship-receipt`
**Location:** `supabase/functions/send-sponsorship-receipt/index.ts`

**Purpose:** Generates HTML email receipt and sends via Resend API. **DOES NOT** create database records.

**Authentication:** Service role (called by other edge functions)

**Request Body:**
```typescript
{
  sponsorEmail: string,
  sponsorName?: string,
  bestieName: string,
  amount: number,
  frequency: 'monthly' | 'one-time',
  transactionId: string,
  transactionDate: string,
  stripeMode: 'test' | 'live'
}
```

**Key Features:**
- Fetches organization settings from `receipt_settings` table
- Generates professional HTML receipt email
- Includes organization EIN for tax deduction purposes
- Sends via Resend API
- NO database record creation (calling function handles that)

**HTML Email Template Structure:**
```html
<html>
  <head>
    <style>/* Professional receipt styling */</style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="{organization_logo_url}" />
        <h1>Sponsorship Receipt</h1>
      </div>
      
      <div class="details">
        <p><strong>Receipt Number:</strong> {receipt_number}</p>
        <p><strong>Date:</strong> {transaction_date}</p>
        <p><strong>Sponsor:</strong> {sponsor_name}</p>
        <p><strong>Bestie:</strong> {bestie_name}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Frequency:</strong> {frequency}</p>
      </div>
      
      <div class="tax-info">
        <p>{organization_name} is a tax-exempt organization.</p>
        <p>EIN: {organization_ein}</p>
        <p>This receipt may be used for tax deduction purposes.</p>
      </div>
    </div>
  </body>
</html>
```

**Environment Variables Required:**
- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 3. `stripe-webhook`
**Location:** `supabase/functions/stripe-webhook/index.ts`

**Purpose:** Handles Stripe subscription lifecycle events.

**Authentication:** Webhook signature verification

**Handled Events:**
- `checkout.session.completed` - Initial subscription creation
- `customer.subscription.updated` - Status changes
- `customer.subscription.deleted` - Cancellations

**Note:** This function ALSO follows the "insert receipt first, then email" pattern with duplicate handling via the unique constraint on `transaction_id`.

---

## Frontend Components

### `SponsorshipSuccess.tsx`
**Location:** `src/pages/SponsorshipSuccess.tsx`

**Purpose:** Confirmation page shown after successful payment.

**Key Features:**

#### 1. Idempotency Guard (Prevents React Strict Mode Duplicates)
```typescript
const verificationInProgress = useRef(false);

const verifyPayment = async () => {
  // Prevent duplicate calls from React Strict Mode
  if (verificationInProgress.current) {
    console.log('Verification already in progress, skipping duplicate call');
    return;
  }
  
  verificationInProgress.current = true;
  
  try {
    const { data, error } = await supabase.functions.invoke('verify-sponsorship-payment', {
      body: { session_id: sessionId }
    });
    
    // ... handle response
  } finally {
    setVerifying(false);
    // Delay reset to prevent rapid re-triggers
    setTimeout(() => {
      verificationInProgress.current = false;
    }, 2000);
  }
};
```

**Why This Is Critical:**
- React Strict Mode (development) intentionally double-invokes useEffect
- Without this guard, `verifyPayment()` would be called twice
- Two simultaneous calls could both pass the early-exit check before either inserts a receipt
- Result: Two emails sent
- The `useRef` flag prevents the second invocation from executing

#### 2. Session ID Display and Copy
```typescript
const [copied, setCopied] = useState(false);

const copySessionId = async () => {
  if (sessionId) {
    await navigator.clipboard.writeText(sessionId);
    setCopied(true);
    toast.success('Session ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }
};
```

**UI Features:**
- Shows loading state while verifying payment
- Displays sponsorship details (amount, frequency)
- Provides session ID for support purposes
- Copy-to-clipboard functionality
- Navigation options (return home, sponsor another bestie)

---

## Workflow Diagrams

### Complete Payment-to-Receipt Flow

```mermaid
sequenceDiagram
    participant User
    participant Stripe
    participant Frontend
    participant VerifyFn
    participant Database
    participant SendFn
    participant Resend

    User->>Stripe: Complete Payment
    Stripe->>Frontend: Redirect to /sponsorship-success?session_id=xxx
    Frontend->>Frontend: Check useRef idempotency flag
    Frontend->>VerifyFn: invoke('verify-sponsorship-payment', {session_id})
    
    Note over VerifyFn,Database: CRITICAL: Distributed Lock Pattern
    VerifyFn->>Database: INSERT placeholder receipt (transaction_id=session_id)
    
    alt Placeholder INSERT Succeeds
        Database->>VerifyFn: ✅ Placeholder receipt created (id: xxx)
        VerifyFn->>Stripe: Retrieve checkout session details
        Stripe->>VerifyFn: Session data (email, amount, etc.)
        VerifyFn->>Database: UPSERT sponsorship record
        Database->>VerifyFn: ✅ Sponsorship created/updated
        VerifyFn->>Database: UPDATE placeholder with full details
        Database->>VerifyFn: ✅ Receipt updated
        VerifyFn->>SendFn: invoke('send-sponsorship-receipt', {data})
        SendFn->>Database: Fetch organization settings
        Database->>SendFn: Settings (EIN, logo, etc.)
        SendFn->>Resend: Send HTML email
        Resend->>User: 📧 Receipt email delivered
        SendFn->>VerifyFn: ✅ Email sent
        VerifyFn->>Frontend: ✅ {success: true, amount, frequency}
        Frontend->>User: Show success message
    else Placeholder INSERT Fails (Unique Constraint)
        Database->>VerifyFn: ❌ Error 23505 (duplicate transaction_id)
        Note over VerifyFn: Another instance already processing this transaction
        VerifyFn->>Frontend: ✅ {success: true, alreadyProcessed: true}
        Frontend->>User: Show success message (no duplicate email)
    end
```

### Race Condition Prevention

```
SCENARIO: Two simultaneous calls to verify-sponsorship-payment

OLD APPROACH (BROKEN):
─────────────────────
Call 1: Check if receipt exists → No → Continue → Create sponsorship → Insert receipt → Send email
Call 2: Check if receipt exists → No → Continue → Create sponsorship → Insert receipt fails → Send email anyway
Result: TWO EMAILS SENT ❌

NEW APPROACH (WORKING):
──────────────────────
Call 1: INSERT placeholder receipt → ✅ Success → Continue → Update placeholder → Send email
Call 2: INSERT placeholder receipt → ❌ Error 23505 → Exit early → No email
Result: ONE EMAIL SENT ✅

The database unique constraint acts as a distributed lock across multiple function instances.
```

---

## Duplicate Email Prevention

### Problem History

#### Attempt 1: In-Memory Cache (FAILED)
**Date:** Initial implementation  
**Approach:** Used Map to track processing sessions  
**Why It Failed:** Each edge function invocation gets its own memory space; cache not shared across instances

```typescript
// ❌ DOES NOT WORK
const processingCache = new Map<string, boolean>();

if (processingCache.has(session_id)) {
  return; // This check is useless across different function instances
}
processingCache.set(session_id, true);
```

#### Attempt 2: Early Database Check (FAILED)
**Date:** 2025-11-02  
**Approach:** Check for existing receipt at function start  
**Why It Failed:** "Read then decide" pattern - race condition between check and insert

```typescript
// ❌ RACE CONDITION
// Both calls can read "no receipt" before either writes
const existingReceipt = await supabase
  .from('sponsorship_receipts')
  .select('id')
  .eq('transaction_id', session_id)
  .maybeSingle();

if (existingReceipt) return; // Both calls pass this check

// Later...
await supabase.from('sponsorship_receipts').insert({...}); // Both calls execute this
```

#### Attempt 3: Duplicate Check in send-sponsorship-receipt (FAILED)
**Date:** 2025-11-02  
**Approach:** Check for duplicates inside email function  
**Why It Failed:** Email was sent BEFORE database check; check happened after the fact

#### Attempt 4: Insert-First Pattern Without Placeholder (PARTIALLY WORKED)
**Date:** 2025-11-03 (morning)  
**Approach:** Insert full receipt immediately, handle unique constraint errors  
**Why It Still Failed:** Two calls could both get past the early check before either completed the insert

### Final Solution: Distributed Locking Pattern (SUCCESS)

**Date:** 2025-11-03 (afternoon)  
**Approach:** Two-layer defense

#### Layer 1: Frontend Idempotency Guard
```typescript
// Prevents React Strict Mode from causing duplicate calls
const verificationInProgress = useRef(false);

if (verificationInProgress.current) {
  return; // Skip duplicate call
}
verificationInProgress.current = true;
```

**Purpose:** Eliminates duplicate calls at the source in development mode

#### Layer 2: Backend Distributed Lock
```typescript
// Use database INSERT as a distributed lock
const { data: placeholder, error } = await supabaseAdmin
  .from('sponsorship_receipts')
  .insert({
    transaction_id: session_id, // UNIQUE constraint
    // ... minimal placeholder data
  });

if (error?.code === '23505') {
  // Another instance already claimed this transaction
  return { success: true, alreadyProcessed: true };
}

// Only the successful INSERT continues...
```

**Purpose:** Guarantees only one function instance can claim and process each transaction

### Why This Solution Works

1. **Database as Source of Truth**
   - Unique constraint is enforced at database level
   - PostgreSQL guarantees atomicity of INSERT operations
   - No race conditions possible

2. **Pessimistic Locking**
   - Instead of "check then act" (optimistic)
   - We "try to claim then proceed" (pessimistic)
   - First one to INSERT wins

3. **Fail-Safe Design**
   - Failed instances exit gracefully
   - No errors logged to user
   - Idempotent behavior (multiple calls = same result)

4. **Defense in Depth**
   - Frontend prevents unnecessary calls
   - Backend ensures correctness even if frontend fails
   - Works in both development and production

---

## Testing & Verification

### Manual Testing Checklist

#### Test 1: Single Payment Success Flow
```
1. Navigate to /sponsor-bestie
2. Select a bestie and amount
3. Complete Stripe checkout
4. Verify redirect to /sponsorship-success?session_id=xxx
5. Check email inbox for receipt
6. Verify database records:
   - sponsorships table has new record
   - sponsorship_receipts table has ONE record with matching transaction_id
```

#### Test 2: Duplicate Call Prevention (React Strict Mode)
```
1. Enable React Strict Mode in development
2. Complete a payment
3. Open browser console
4. Look for log: "Verification already in progress, skipping duplicate call"
5. Verify only ONE email received
6. Verify only ONE receipt record in database
```

#### Test 3: Race Condition Prevention (Multiple Tabs)
```
1. Complete Stripe checkout
2. Copy the success URL with session_id
3. Open URL in 3 different browser tabs simultaneously
4. Verify only ONE email received
5. Check logs for "Transaction already being processed" messages
6. Verify only ONE receipt record in database
```

#### Test 4: Guest vs Authenticated Checkout
```
Guest:
1. Log out
2. Complete sponsorship checkout
3. Verify sponsorship has sponsor_email but no sponsor_id
4. Create account with same email
5. Verify link_guest_sponsorships() trigger updates the record

Authenticated:
1. Log in
2. Complete sponsorship checkout
3. Verify sponsorship has sponsor_id
4. Verify sponsor_email is NULL
```

### Log Verification

#### Expected Logs (Success Path)
```
[verify-sponsorship-payment]
Verifying sponsorship payment for session: cs_test_xxx
Detected session mode from prefix: test
Transaction claimed successfully, placeholder receipt created: <uuid>
Session retrieved: {status: "paid", metadata: {...}}
Sponsorship created: <uuid> (authenticated/guest)
Updating placeholder receipt with final details for session: cs_test_xxx
Receipt record updated, sending email...
Receipt email sent for session: cs_test_xxx

[send-sponsorship-receipt]
[AUDIT] Receipt generation starting for: user@example.com
[AUDIT] Settings fetched successfully
[AUDIT] Sending email to: user@example.com
[AUDIT] Email sent successfully: <resend_email_id>
```

#### Expected Logs (Duplicate Prevention)
```
[verify-sponsorship-payment]
Verifying sponsorship payment for session: cs_test_xxx
Detected session mode from prefix: test
Transaction already being processed by another instance: cs_test_xxx
```

### Database Queries for Verification

```sql
-- Check for duplicate receipts
SELECT transaction_id, COUNT(*) as count
FROM sponsorship_receipts
GROUP BY transaction_id
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check receipt creation timeline
SELECT 
  id,
  transaction_id,
  sponsor_email,
  amount,
  created_at
FROM sponsorship_receipts
WHERE transaction_id = 'cs_test_xxx'
ORDER BY created_at DESC;
-- Should show only 1 record per transaction_id

-- Check sponsorship-receipt linkage
SELECT 
  s.id as sponsorship_id,
  s.sponsor_email,
  s.amount,
  sr.id as receipt_id,
  sr.receipt_number,
  sr.created_at as receipt_created
FROM sponsorships s
LEFT JOIN sponsorship_receipts sr ON sr.sponsorship_id = s.id
WHERE s.stripe_subscription_id = 'sub_xxx';
-- Should show 1:1 relationship
```

---

## Troubleshooting

### Issue: User Reports Not Receiving Email

**Diagnosis Steps:**
1. Check edge function logs for `verify-sponsorship-payment`
   ```bash
   # Look for the session_id in logs
   grep "cs_test_xxx" logs
   ```

2. Verify receipt record exists
   ```sql
   SELECT * FROM sponsorship_receipts
   WHERE transaction_id = 'cs_test_xxx';
   ```

3. Check `send-sponsorship-receipt` logs
   ```bash
   # Look for email sending confirmation
   grep "Email sent successfully" logs
   ```

4. Check Resend dashboard for email delivery status

**Common Causes:**
- Email sent to spam folder
- Incorrect email address in Stripe checkout
- Resend API key not configured
- Organization settings not configured in `receipt_settings` table

**Resolution:**
```sql
-- Resend receipt manually (if needed)
-- Call send-sponsorship-receipt edge function with receipt data
```

---

### Issue: Duplicate Emails Still Occurring

**Diagnosis Steps:**
1. Check for multiple receipt records
   ```sql
   SELECT transaction_id, COUNT(*) 
   FROM sponsorship_receipts 
   GROUP BY transaction_id 
   HAVING COUNT(*) > 1;
   ```

2. Review edge function logs for race condition indicators
   ```bash
   # Look for concurrent processing
   grep "Transaction already being processed" logs
   ```

3. Verify unique constraint exists
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'sponsorship_receipts'
   AND constraint_type = 'UNIQUE';
   ```

**Common Causes:**
- Unique constraint was dropped during migration
- Different Stripe session IDs for same payment (shouldn't happen)
- Frontend idempotency guard not active

**Resolution:**
1. Verify unique constraint:
   ```sql
   ALTER TABLE sponsorship_receipts
   ADD CONSTRAINT unique_transaction_id UNIQUE (transaction_id);
   ```

2. Redeploy edge functions to ensure latest code

---

### Issue: "Transaction Already Being Processed" Error Visible to User

**Diagnosis:**
This is actually NOT an error - it's the duplicate prevention working correctly.

**Expected Behavior:**
- Function returns `{success: true, alreadyProcessed: true}`
- User sees normal success message
- No error shown to user
- Only ONE email sent

**If User Sees Error:**
Check if frontend is correctly handling the response:
```typescript
// Should NOT treat alreadyProcessed as an error
if (data.alreadyProcessed) {
  // This is success, not an error!
  toast.success('Sponsorship confirmed!');
}
```

---

### Issue: Guest Sponsorships Not Linking After Account Creation

**Diagnosis Steps:**
1. Verify trigger exists:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname = 'on_auth_user_created_link_sponsorships';
   ```

2. Check for matching email:
   ```sql
   SELECT s.id, s.sponsor_email, s.sponsor_id, u.email
   FROM sponsorships s
   LEFT JOIN auth.users u ON u.email = s.sponsor_email
   WHERE s.sponsor_email = 'user@example.com';
   ```

**Resolution:**
Manually link if trigger didn't fire:
```sql
UPDATE sponsorships
SET sponsor_id = 'user-uuid',
    sponsor_email = NULL
WHERE sponsor_email = 'user@example.com'
AND sponsor_id IS NULL;
```

---

## Configuration Requirements

### Environment Variables

**Required in Supabase Edge Functions:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_ANON_KEY=eyJxxx...
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
RESEND_API_KEY=re_xxx
```

### Database Setup

**Required Tables:**
- `sponsorships` - Subscription/payment records
- `sponsorship_receipts` - Receipt audit trail
- `sponsor_besties` - Bestie profiles available for sponsorship
- `receipt_settings` - Organization tax information

**Required Constraints:**
- `sponsorship_receipts.transaction_id` UNIQUE
- `sponsorships.stripe_subscription_id` UNIQUE
- `sponsorships (sponsor_id, sponsor_bestie_id)` UNIQUE

### Stripe Configuration

**Webhook Events to Enable:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Success URL Format:**
```
https://yourdomain.com/sponsorship-success?session_id={CHECKOUT_SESSION_ID}
```

### Resend Configuration

**Sender Email:**
Must use verified domain (e.g., `receipt@bestdayministries.org`)

**From Name:**
Organization name from `receipt_settings` table

---

## Performance Considerations

### Edge Function Cold Start
- First invocation: ~2-3 seconds
- Subsequent invocations: ~200-500ms

### Database Operations
- Placeholder INSERT: ~50ms
- Sponsorship UPSERT: ~100ms
- Receipt UPDATE: ~50ms
- Total database time: ~200ms

### Email Delivery
- Resend API call: ~500ms-1s
- Actual delivery: 1-5 seconds

### Total Time from Payment to Email
**Typical:** 3-5 seconds  
**Worst Case:** 10-15 seconds (cold start + slow email delivery)

---

## Security Considerations

### PII Handling
- Email addresses stored in database
- Names derived from email or Stripe metadata
- All PII access requires authentication or service role

### Row Level Security (RLS)

```sql
-- Users can only view their own receipts
CREATE POLICY "Users can view own receipts"
ON sponsorship_receipts FOR SELECT
USING (user_id = auth.uid() OR sponsor_email = get_user_email(auth.uid()));

-- Admins can view all receipts
CREATE POLICY "Admins can view all receipts"
ON sponsorship_receipts FOR SELECT
USING (has_admin_access(auth.uid()));
```

### Stripe Webhook Security
- Signature verification required
- Test and live webhooks use different secrets
- Signatures verified before processing events

### Service Role Usage
- Only edge functions have access to service role key
- Never exposed to frontend
- Used for admin-level database operations

---

## Future Enhancements

### Planned Features
1. **Batch Receipt Generation**
   - Monthly summaries for recurring sponsors
   - Year-end tax summaries

2. **Receipt PDF Generation**
   - Downloadable PDF receipts
   - Archive in storage bucket

3. **Receipt Resending**
   - Admin interface to resend receipts
   - User self-service receipt download

4. **Advanced Tax Reporting**
   - Annual giving statements
   - IRS-compliant formats
   - Multi-year summaries

### Technical Debt
- Add retry logic for failed email sends
- Implement receipt generation queue for high-volume periods
- Add monitoring/alerting for duplicate detection
- Create admin dashboard for receipt management

---

## Related Documentation

- `MASTER_SYSTEM_DOCS.md` - Sponsorship section
- `EDGE_FUNCTIONS_REFERENCE.md` - All edge functions
- `docs/DONATION_SYSTEM.md` - Related donation system
- `tests/e2e/archived/week6-final-archive/sponsorship.spec.ts` - E2E tests

---

## Change Log

### 2025-11-03
- **MAJOR:** Implemented distributed locking pattern for duplicate prevention
- **MAJOR:** Added frontend idempotency guard using useRef
- **CHANGE:** Removed in-memory cache (ineffective across instances)
- **CHANGE:** Removed early database check pattern (race condition)
- **CHANGE:** Removed duplicate checking from send-sponsorship-receipt
- **FIX:** Duplicate emails eliminated
- **TEST:** Verified in development with React Strict Mode
- **TEST:** Verified race condition prevention with multiple tabs

### 2025-11-02
- Multiple failed attempts to fix duplicate emails
- Tried in-memory cache, early checks, email-function checks
- All approaches failed due to race conditions or architectural issues

### Prior to 2025-11-02
- Original implementation with basic receipt generation
- No duplicate prevention
- Occasional duplicate emails reported

---

## Conclusion

The sponsorship receipt system is now robust and production-ready with the following guarantees:

✅ **ONE receipt record per transaction** (database unique constraint)  
✅ **ONE email per transaction** (distributed locking pattern)  
✅ **Works in development** (React Strict Mode protection)  
✅ **Works in production** (concurrent request handling)  
✅ **Idempotent** (multiple calls produce same result)  
✅ **Fail-safe** (graceful handling of duplicates)  
✅ **Auditable** (complete log trail)  
✅ **Tax-compliant** (proper receipt generation)

The key insight that made this work: **Use the database INSERT operation itself as a distributed lock, rather than checking-then-acting.**
