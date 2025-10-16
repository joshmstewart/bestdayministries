# EMAIL TESTING SYSTEM - COMPLETE REFERENCE DOCUMENTATION

**⚠️ MANDATORY: AI MUST READ THIS ENTIRE DOCUMENT BEFORE MAKING ANY CHANGES TO EMAIL TESTS ⚠️**

## System Overview

This project has 22 email tests across 6 test files that verify production email infrastructure via database state, not mock services. Tests interact with the actual Resend service and verify results by checking database tables.

---

## TEST FILES & COUNTS

### 1. email-approvals.spec.ts (3 tests)
- Post approval notification
- Comment approval notification  
- Vendor asset approval notification

### 2. email-digest.spec.ts (3 tests)
- Daily digest aggregation
- Weekly digest aggregation
- Digest respects user preferences

### 3. email-notifications.spec.ts (4 tests)
- Comment notification
- Sponsor message notification
- Product update notification
- Respects email preferences

### 4. email-sponsorship-receipts.spec.ts (4 tests)
- Monthly sponsorship receipt
- One-time sponsorship receipt
- Receipt includes org info
- Generate missing receipts

### 5. email-messages.spec.ts (3 tests)
- Sponsor sends message to bestie
- Bestie sends message to sponsor
- Guardian sends message to sponsor

### 6. email-contact-form-resend.spec.ts (5 tests)
- Form submission saves to database
- Inbound email reply saves to database
- Admin reply updates submission status
- Email validation before saving
- Multiple replies create conversation thread

**TOTAL: 22 email tests (17 notification/approval/receipt + 5 contact form)**

---

## CI/CD WORKFLOW CONFIGURATION

### GitHub Actions Setup
- **File**: `.github/workflows/test.yml` (lines 122-151)
- **Job**: `email-tests`
- **Trigger**: Manual workflow dispatch with `run_email_tests` input (default: false)
- **Browser**: Chromium only (not sharded)
- **Timeout**: 45 minutes
- **Command**: `npx playwright test --grep "@email" tests/e2e/email-*.spec.ts --project=chromium`

### Test Execution Flow
1. **Seed Test Data**: Each test file's `beforeAll` hook calls `seed-email-test-data` edge function
2. **Run Tests**: Playwright executes all 22 tests with `@email` tag
3. **Log Results**: Separate `log-results` job aggregates outcomes and logs to `test_runs` table

### Why Email Tests Are Separate
- **Manual trigger** prevents unnecessary Resend API calls (costs)
- **No sharding** because tests share authenticated clients and can't run in parallel
- **Longer timeout** because tests wait for database state changes (5s delays)
- **Chromium only** to reduce test execution time (email flow is browser-agnostic)

### Seed Function Dependency
Email tests require the `seed-email-test-data` edge function to create:
- 4 test users (guardian, bestie, sponsor, vendor) with known emails
- All required database relationships (sponsorships, bestie links, etc.)
- JWT access/refresh tokens for authenticated Supabase clients
- Receipt settings with known organization details ('Test Organization', '12-3456789')

**Location**: `supabase/functions/seed-email-test-data/index.ts`
**Returns**: 
```typescript
{
  success: boolean,
  message: string,
  userIds: {
    guardian: string,
    bestie: string,
    sponsor: string,
    vendor: string
  },
  testRunId: string,
  emailPrefix: string,
  authSessions: {
    guardian: { access_token: string, refresh_token: string },
    bestie: { access_token: string, refresh_token: string },
    sponsor: { access_token: string, refresh_token: string },
    vendor: { access_token: string, refresh_token: string }
  }
}
```

---

## DATABASE SCHEMA REQUIREMENTS

### Required Tables & Critical Columns

#### sponsorship_receipts
- `id` (uuid, PK)
- `sponsor_email` (text, NOT NULL)
- `sponsor_name` (text)
- `bestie_name` (text, NOT NULL)
- `amount` (numeric, NOT NULL)
- `frequency` (text, NOT NULL) - 'monthly' | 'one-time'
- `transaction_id` (text, NOT NULL, UNIQUE with sponsor_email)
- `transaction_date` (timestamp, NOT NULL)
- `receipt_number` (text, NOT NULL, UNIQUE)
- `tax_year` (integer, NOT NULL)
- `stripe_mode` (text, NOT NULL, DEFAULT 'live')
- `user_id` (uuid, FK to profiles)
- **`sponsorship_id` (uuid, FK to sponsorships)** ← CRITICAL!
- **`organization_name` (text)** ← CRITICAL!
- **`organization_ein` (text)** ← CRITICAL!

#### receipt_settings
- `id` (uuid, PK)
- `organization_name` (text, NOT NULL)
- **`organization_ein` (text, NOT NULL)** ← NOT `tax_id`!
- `organization_address` (text)
- `from_email` (text, NOT NULL)
- `reply_to_email` (text)
- `receipt_message` (text, NOT NULL)
- `tax_deductible_notice` (text, NOT NULL)
- `website_url` (text)

#### notification_preferences
- `user_id` (uuid, PK, FK to profiles)
- **`enable_digest_emails` (boolean, NOT NULL, DEFAULT true)** ← CRITICAL!
- `digest_frequency` (text, NOT NULL, DEFAULT 'daily')
- `email_on_*` (13 boolean columns for email preferences)
- `inapp_on_*` (13 boolean columns for in-app preferences)
- `last_digest_sent_at` (timestamp)

#### vendor_bestie_assets
- `id` (uuid, PK)
- `vendor_id` (uuid, FK to vendors, NOT NULL)
- `bestie_id` (uuid, FK to profiles)
- **`vendor_bestie_request_id` (uuid, FK to vendor_bestie_requests)** ← CRITICAL!
- `asset_type` (text, NOT NULL)
- `asset_url` (text, NOT NULL)
- `approval_status` (text, NOT NULL, DEFAULT 'pending_approval')

#### sponsorships
- `id` (uuid, PK)
- `sponsor_id` (uuid, FK to profiles, NOT NULL)
- `bestie_id` (uuid, FK to profiles, NOT NULL)
- **`sponsor_bestie_id` (uuid, FK to sponsor_besties, NOT NULL)** ← CRITICAL!
- `amount` (numeric, NOT NULL)
- `frequency` (text, NOT NULL)
- `status` (text, NOT NULL)
- `stripe_subscription_id` (text)
- `stripe_customer_id` (text)
- `stripe_mode` (text, DEFAULT 'test')

#### sponsor_besties
- `id` (uuid, PK)
- `bestie_id` (uuid, FK to profiles, NOT NULL)
- `bestie_name` (text, NOT NULL)
- `image_url` (text)
- `aspect_ratio` (text, DEFAULT '9:16')
- `monthly_goal` (numeric)
- `is_active` (boolean, DEFAULT true)
- `is_fully_funded` (boolean, DEFAULT false)
- `created_by` (uuid, FK to profiles)
- `approval_status` (text, DEFAULT 'pending_approval')
- `is_public` (boolean, DEFAULT false)
- `text_sections` (jsonb)

---

## TROUBLESHOOTING COMMON FAILURES

### Receipt Organization Name Mismatch
**Error**: 
```
Expected: undefined
Received: "Best Day Ministries"
```
**Cause**: Test tried to fetch `receipt_settings` with unauthenticated client, failed RLS, got `undefined`  
**Fix**: Assert against known seed values (`'Test Organization'`, `'12-3456789'`) instead of querying settings  
**Status**: ✅ Fixed in email-sponsorship-receipts.spec.ts lines 168-169

---

### Database Error Creating New User
**Error**: `Database error creating new user` during seed function execution  
**Cause**: Race condition, constraint violation, or profile trigger timing issue  
**Impact**: Tests fail randomly but succeed on retry  
**Fix**: Seed function has built-in retry logic; tests should eventually succeed

---

### Failed to Seed Test Data
**Error**: `Edge Function returned a non-2xx status code`  
**Cause**: Seed function threw an error (see edge function logs for details)  
**Common Reasons**:
- Missing environment variables (RESEND_API_KEY, etc.)
- Database schema mismatch (missing columns)
- RLS policy blocking INSERT operations
- Unique constraint violation (test data already exists)  
**Fix**: Check edge function logs in Lovable backend for specific error message

---

### Tests Pass Locally But Fail in CI
**Possible Causes**:
- **Timing differences**: CI is slower, increase timeout values
- **Rate limits**: Resend API rate limiting in CI environment
- **Missing secrets**: Verify all GitHub Secrets are configured (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, RESEND_API_KEY)
- **Test isolation**: Tests aren't properly cleaning up data between runs

**Fix**: 
1. Check GitHub Actions logs for specific error messages
2. Verify secrets are set in repository settings
3. Ensure cleanup functions run in `afterEach` hooks
4. Increase timeouts for flaky tests

---

### Notification Preference Tests Fail
**Error**: Tests expect `enable_digest_emails` column but it doesn't exist  
**Fix**: Run database migration to add column:
```sql
ALTER TABLE notification_preferences
ADD COLUMN enable_digest_emails BOOLEAN NOT NULL DEFAULT true;
```

---

### Receipt Tests Fail With Missing Organization Fields
**Error**: `organization_name` or `organization_ein` not found in receipt  
**Fix**: Run database migration:
```sql
ALTER TABLE sponsorship_receipts
ADD COLUMN organization_name TEXT,
ADD COLUMN organization_ein TEXT;
```

---

## EDGE FUNCTION CONTRACTS

### send-sponsorship-receipt

**Input Schema (Zod):**
```typescript
{
  sponsorshipId?: string.uuid(),
  sponsorEmail: string.email().max(255),
  sponsorName?: string.max(100),
  bestieName: string.min(1).max(100),
  amount: number.positive().max(1000000),
  frequency: 'monthly' | 'one-time',
  transactionId: string.min(1).max(255),
  transactionDate: string (ISO date),
  stripeMode?: 'test' | 'live' (default: 'live')
}
```

**CRITICAL BEHAVIORS:**
1. If ONLY `sponsorshipId` provided → MUST query database for all other fields
2. MUST fetch `receipt_settings` using `organization_ein` (NOT `tax_id`)
3. MUST insert into `sponsorship_receipts` with ALL fields including:
   - `sponsorship_id`
   - `organization_name` 
   - `organization_ein`
4. Email template line ~263: MUST use `settings.organization_ein` (NOT `settings.tax_id`)

**Test Usage:**
```typescript
// Tests ONLY provide sponsorshipId
await supabase.functions.invoke('send-sponsorship-receipt', {
  body: { sponsorshipId: sponsorship.id }
});
```

**Database Queries Needed When sponsorshipId Provided:**
```sql
-- Get sponsorship details
SELECT 
  s.id,
  s.amount,
  s.frequency,
  s.stripe_subscription_id as transaction_id,
  s.created_at as transaction_date,
  s.stripe_mode,
  p.email as sponsor_email,
  p.display_name as sponsor_name,
  sb.bestie_name
FROM sponsorships s
JOIN profiles p ON p.id = s.sponsor_id
JOIN sponsor_besties sb ON sb.id = s.sponsor_bestie_id
WHERE s.id = sponsorshipId
```

### send-digest-email

**Input:**
```typescript
{ frequency: 'daily' | 'weekly' }
```

**Behavior:**
- Query `get_users_needing_digest(frequency)` RPC
- RPC MUST check `enable_digest_emails = true`
- Group notifications by type
- Insert into `digest_emails_log` with count

**RPC Requirements:**
```sql
SELECT 
  n.user_id,
  p.email,
  COUNT(*) as unread_count
FROM notifications n
JOIN profiles p ON p.id = n.user_id
JOIN notification_preferences np ON np.user_id = n.user_id
WHERE n.is_read = false
  AND np.digest_frequency = _frequency
  AND np.enable_digest_emails = true  -- CRITICAL!
  AND (
    (_frequency = 'daily' AND ...) OR
    (_frequency = 'weekly' AND ...)
  )
GROUP BY n.user_id, p.email
HAVING COUNT(*) > 0;
```

### send-notification-email

**Input:**
```typescript
{
  userId: string.uuid(),
  notificationType: string,
  title: string,
  message: string,
  link: string,
  subject: string
}
```

**Behavior:**
- Check `notification_preferences.email_on_*` for type
- Send via Resend
- Insert into `email_notifications_log`

### send-approval-notification

**Input:**
```typescript
{
  contentType: 'post' | 'comment' | 'vendor_asset',
  contentId: string.uuid(),
  bestieId?: string.uuid(),
  guardianId?: string.uuid(),
  vendorId?: string.uuid(),
  status: 'approved' | 'rejected'
}
```

**Behavior:**
- Create notification record
- Send email via Resend
- Auto-resolve related pending notifications

### send-message-notification

**Input:**
```typescript
{
  messageId: string.uuid(),
  recipientType: 'sponsor' | 'bestie' | 'guardian',
  recipientId: string.uuid()
}
```

**Behavior:**
- Fetch message details
- Create notification
- Send email if preferences allow

---

## SEED FUNCTION REQUIREMENTS

**supabase/functions/seed-email-test-data/index.ts**

### MUST Create (in order):
1. Auth users (guardian, bestie, sponsor, vendor)
2. Profiles with friend codes
3. User roles
4. Guardian-bestie link with ALL approval flags
5. Featured bestie
6. **Sponsor-bestie with `sponsor_bestie_id`**
7. **Sponsorships with `sponsor_bestie_id` FK**
8. Discussion posts & comments
9. Vendor
10. Vendor-bestie request
11. **Vendor asset with `vendor_bestie_request_id` FK**
12. Notifications
13. **Notification preferences with `enable_digest_emails`**
14. **Receipt settings with `organization_ein`**
15. JWT tokens for authenticated clients

### CRITICAL RELATIONSHIPS:
- `sponsorships.sponsor_bestie_id` → `sponsor_besties.id`
- `vendor_bestie_assets.vendor_bestie_request_id` → `vendor_bestie_requests.id`
- `sponsorship_receipts.sponsorship_id` → `sponsorships.id`

### Return Value:
```typescript
{
  success: boolean,
  message: string,
  userIds: {
    guardian: string,
    bestie: string,
    sponsor: string,
    vendor: string
  },
  testRunId: string,
  emailPrefix: string,
  authSessions: {
    guardian: { access_token: string, refresh_token: string },
    bestie: { access_token: string, refresh_token: string },
    sponsor: { access_token: string, refresh_token: string },
    vendor: { access_token: string, refresh_token: string }
  }
}
```

---

## TEST PATTERNS

### Authentication
```typescript
// Create authenticated client
const authClient = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

await authClient.auth.setSession({
  access_token: seedData.authSessions.sponsor.access_token,
  refresh_token: seedData.authSessions.sponsor.refresh_token
});
```

### Database Verification (NOT email capture)
```typescript
// Wait for async processing
await new Promise(resolve => setTimeout(resolve, 5000));

// Verify database state
const { data } = await supabase
  .from('sponsorship_receipts')
  .select('*')
  .eq('sponsorship_id', sponsorship.id)
  .order('created_at', { ascending: false })
  .limit(1);

expect(data).toBeTruthy();
expect(data![0].organization_ein).toBe(settings?.organization_ein);
```

---

## COMMON FAILURE MODES

### 1. Schema Mismatch
- **Symptom**: Seed function fails with "column doesn't exist"
- **Cause**: Code references column not in database
- **Fix**: Verify `src/integrations/supabase/types.ts` BEFORE coding

### 2. Missing FK Relationships
- **Symptom**: Tests fail with "foreign key constraint violation"
- **Cause**: Seed function inserts child before parent or wrong FK value
- **Fix**: Check insert order and FK column names

### 3. Wrong Field Names
- **Symptom**: Tests expect field A, code uses field B
- **Cause**: Old column name still in code after migration
- **Fix**: Search ALL files for old column name, replace with new

### 4. RPC Missing Column Check
- **Symptom**: Digest tests fail to respect preferences
- **Cause**: RPC doesn't filter by new preference column
- **Fix**: Update RPC WHERE clause to check column

### 5. Edge Function Schema Mismatch
- **Symptom**: Edge function fails validation
- **Cause**: Zod schema requires fields tests don't provide
- **Fix**: Make fields optional, query database if not provided

### 6. Missing Organization Fields in Receipt
- **Symptom**: Test fails checking `organization_ein` or `organization_name`
- **Cause**: Edge function doesn't populate these fields in INSERT
- **Fix**: Add `organization_name: settings.organization_name` and `organization_ein: settings.organization_ein` to INSERT

---

## VERIFICATION CHECKLIST

### Before Making ANY Changes:
- [ ] Read this entire document
- [ ] Review `src/integrations/supabase/types.ts` for actual schema
- [ ] Check seed function for FK relationships
- [ ] Verify edge function input schemas match test usage
- [ ] Confirm column names match between seed, edge, and types

### After Making Changes:
- [ ] Update this document if behavior changes
- [ ] Verify seed function creates ALL required data
- [ ] Test edge functions handle test input patterns
- [ ] Confirm database schema matches all code references
- [ ] Run all 22 tests to verify no regressions

---

## KEY PRINCIPLES

1. **Schema is Source of Truth**: Always check `types.ts` before coding
2. **Tests Verify Database**: No mock email services, verify DB state
3. **Edge Functions Must Be Flexible**: Accept minimal input, query what's needed
4. **Relationships Must Exist**: Parent records before children, correct FKs
5. **Column Names Must Match**: One mismatch breaks everything
6. **Foreign Keys Are Critical**: Every child must have valid parent reference
7. **Organization Fields**: `organization_ein` NOT `tax_id` everywhere

---

## KNOWN ISSUES TO AVOID

### Issue: receipt_settings.tax_id → organization_ein
- **Old Code**: `settings.tax_id`
- **New Code**: `settings.organization_ein`
- **Location**: `send-sponsorship-receipt/index.ts` line ~263

### Issue: sponsorship_receipts missing organization fields
- **Missing**: `organization_name`, `organization_ein`, `sponsorship_id`
- **Required**: All three columns must exist and be populated

### Issue: notification_preferences missing enable_digest_emails
- **Missing**: `enable_digest_emails` column
- **Required**: Column must exist, RPC must check it

### Issue: vendor_bestie_assets missing vendor_bestie_request_id
- **Missing**: `vendor_bestie_request_id` FK
- **Required**: Must link to parent request

### Issue: sponsorships missing sponsor_bestie_id
- **Missing**: `sponsor_bestie_id` FK
- **Required**: Must link to sponsor_besties table

---

## MAINTENANCE

When adding new email tests:
1. Add to this document with test count
2. Document required database schema
3. Document edge function contract
4. Update seed function if needed
5. Add to verification checklist

When changing email functionality:
1. Update this document FIRST
2. Then update code to match
3. Verify all 22 tests still pass
4. Update test counts if changed

---

**Last Updated**: 2025-01-16
**Test Count**: 22 (17 notification/approval/receipt + 5 contact form)
**Status**: Active - MUST READ BEFORE ANY EMAIL TEST CHANGES
