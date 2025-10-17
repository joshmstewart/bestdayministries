# Unified Test Data Cleanup System

## Overview

This system provides **ONE comprehensive cleanup mechanism** for all test data created during both email testing and general E2E testing. It combines the meticulous 13-table cascade cleanup from the email testing system with flexible pattern-based cleanup for E2E tests.

## Core Components

### 1. Unified Edge Function: `cleanup-test-data-unified`

**Location**: `supabase/functions/cleanup-test-data-unified/index.ts`

This single edge function handles ALL test data cleanup with two cleanup strategies:

#### Strategy 1: Email Test Cleanup (by email prefix)
```typescript
{
  testRunId: "1234567890",           // Auto-generates prefix emailtest-1234567890
  emailPrefix: "emailtest-custom"    // Or specify custom prefix
}
```

Cleans up users whose emails match:
- `emailtest-{testRunId}@test.com`
- `emailtest-*@test.com`
- `testbestie@example.com`
- `testguardian@example.com`
- `testsupporter@example.com`
- `testvendor@example.com`
- Any email containing "test" and "@test.com"

#### Strategy 2: E2E Test Cleanup (by name patterns)
```typescript
{
  namePatterns: ["Test", "E2E"]  // Cleans records with these patterns in names
}
```

Cleans up records where:
- `bestie_name` contains "Test" or "E2E" (featured_besties)
- `title` contains "Test" or "E2E" (discussion_posts)
- `business_name` contains "Test" or "E2E" (vendors)

### 2. Comprehensive 19-Step Cascade Cleanup

The unified function performs cleanup in this exact order:

1. **notifications** - Delete notifications for test users
2. **notification_preferences** - Delete preferences for test users
3. **email_notifications_log** - Delete email logs for test users
4. **contact_form_replies** - Delete contact form replies (before submissions due to FK)
5. **contact_form_submissions** - Delete submissions by test email patterns
6. **discussion_comments** - Delete comments by test users OR matching patterns
7. **discussion_posts** - Delete posts by test users OR matching patterns
8. **moderation_queue** - Delete moderation items involving test users
9. **featured_bestie_hearts** - Delete hearts from test users
10. **featured_besties** - Delete besties for test users OR matching patterns
11. **vendor_bestie_assets** + **vendor_bestie_requests** + **order_items** + **products** + **vendors** - Delete vendor-related data
12. **vendors** (by name pattern) - Delete vendors matching test patterns
13. **sponsorships** - Delete sponsorships involving test users
14. **sponsor_besties** - CRITICAL: Delete sponsor relationships (blocks user deletion)
15. **caregiver_bestie_links** - Delete guardian-bestie links
16. **events** + **event_dates** + **event_attendees** - Delete events and related data
17. **albums** + **album_images** - Delete albums and images
18. **newsletter_subscribers** - Delete test email subscribers
19. **newsletter_campaigns** + **newsletter_analytics** - Delete test campaigns and analytics

**Then**: Nullify foreign key references and delete profiles and auth.users

Plus: Cleanup orphaned `receipt_settings` with organization_name "Test Organization"

## Usage

### For Email Tests

All email test files use the unified function:

```typescript
// tests/e2e/email-*.spec.ts
test.afterAll(async () => {
  if (seedData) {
    await supabase.functions.invoke('cleanup-test-data-unified', {
      body: { 
        testRunId: seedData.testRunId,
        emailPrefix: seedData.emailPrefix 
      }
    });
  }
});
```

**Files using email cleanup:**
- `tests/e2e/email-approvals.spec.ts`
- `tests/e2e/email-digest.spec.ts`
- `tests/e2e/email-notifications.spec.ts`
- `tests/e2e/email-sponsorship-receipts.spec.ts`
- `tests/e2e/email-contact-form-resend.spec.ts`
- `tests/e2e/email-messages.spec.ts`

### For E2E Tests

General E2E tests use pattern-based cleanup:

```typescript
// tests/global-teardown.ts
await fetch(`${supabaseUrl}/functions/v1/cleanup-test-data-unified`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
  },
  body: JSON.stringify({
    namePatterns: ['Test', 'E2E']
  }),
});
```

**Cleanup triggers:**
- `tests/global-teardown.ts` - Runs after ALL tests complete
- `tests/e2e/cleanup.spec.ts` - Dedicated cleanup test
- `tests/utils/cleanup-helpers.ts` - Helper functions for test cleanup

### Manual Cleanup

Admin panel provides manual cleanup button:

**Location**: Admin → Testing Tab → "Clean Test Data" button

```typescript
// src/components/admin/TestRunsManager.tsx
const { data, error } = await supabase.functions.invoke('cleanup-test-data-unified', {
  body: {
    namePatterns: ['Test', 'E2E']
  }
});
```

## Test Writing Guidelines

### 1. Naming Convention

**ALWAYS** prefix test data with "Test" or "E2E":

```typescript
// ✅ GOOD - Will be auto-cleaned
const testUser = {
  display_name: "Test User",
  email: "emailtest-123@test.com"
};

const testPost = {
  title: "Test Discussion Post",
  content: "Test content"
};

// ❌ BAD - Won't be cleaned automatically
const user = {
  display_name: "John Doe",
  email: "john@example.com"
};
```

### 2. Use Cleanup Helpers

```typescript
import { markAsTestData, generateTestName, cleanupTestData } from '../utils/cleanup-helpers';

// Mark data as test data
const metadata = markAsTestData({ customField: 'value' });
// Returns: { is_test_data: true, test_created_at: '...', test_session_id: 'test-...', customField: 'value' }

// Generate consistent test names
const name = generateTestName('My Feature');
// Returns: "Test My Feature"

// Cleanup in tests
test.afterAll(async ({ page }) => {
  await cleanupTestData(page, {
    removeTestProfiles: true,
    removeTestSponsorships: true,
    removeTestBesties: true,
    removeTestPosts: true,
    removeTestVendors: true
  });
});
```

### 3. Email Test Pattern

For email tests, use the seed-email-test-data helper:

```typescript
test.beforeAll(async () => {
  const testRunId = Date.now().toString();
  const { data } = await supabase.functions.invoke('seed-email-test-data', {
    body: { testRunId }
  });
  seedData = data;
});

test.afterAll(async () => {
  await supabase.functions.invoke('cleanup-test-data-unified', {
    body: { 
      testRunId: seedData.testRunId,
      emailPrefix: seedData.emailPrefix 
    }
  });
});
```

## Preventing Test Data Leaks

### Use Test Email Addresses
```typescript
// ✅ GOOD
"emailtest-123@test.com"
"test@example.com"

// ❌ BAD
"realuser@gmail.com"
"john@company.com"
```

### Always Use Test Prefixes
```typescript
// ✅ GOOD
"Test Sponsorship"
"E2E Discussion Post"

// ❌ BAD
"Monthly Sponsorship"
"Real Discussion"
```

### Use Stripe Test Mode
All Stripe operations in tests use test mode keys automatically.

## Monitoring

### Check for Leftover Test Data

```sql
-- Check for test users
SELECT id, email, display_name 
FROM profiles 
WHERE display_name ILIKE '%Test%' 
   OR display_name ILIKE '%E2E%'
   OR email LIKE '%test@%';

-- Check for test posts
SELECT id, title, author_id 
FROM discussion_posts 
WHERE title ILIKE '%Test%' 
   OR title ILIKE '%E2E%';

-- Check for test sponsorships
SELECT s.id, s.amount, p.display_name 
FROM sponsorships s
JOIN profiles p ON p.id = s.sponsor_id OR p.id = s.bestie_id
WHERE p.display_name ILIKE '%Test%';

-- Check for test vendors
SELECT id, business_name 
FROM vendors 
WHERE business_name ILIKE '%Test%' 
   OR business_name ILIKE '%E2E%';
```

### Automated Cleanup Schedule

Consider setting up a cron job to automatically clean old test data:

```sql
-- Delete test data older than 7 days
DELETE FROM profiles 
WHERE (display_name ILIKE '%Test%' OR display_name ILIKE '%E2E%' OR email LIKE '%test@%')
  AND created_at < NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Test Data Not Cleaning Up

1. **Check naming convention**: Ensure test data uses "Test" or "E2E" prefix
2. **Check email pattern**: Email tests must use `emailtest-` prefix
3. **Manual cleanup**: Use Admin panel "Clean Test Data" button
4. **Check logs**: View edge function logs for `cleanup-test-data-unified`

### Cleanup Fails

If automated cleanup fails:

1. **Manual SQL cleanup**:
```sql
-- Use with caution - this deletes ALL test data
DELETE FROM profiles WHERE display_name ILIKE '%Test%' OR email LIKE '%test@%';
```

2. **Individual table cleanup**:
```sql
DELETE FROM discussion_posts WHERE title ILIKE '%Test%';
DELETE FROM featured_besties WHERE bestie_name ILIKE '%Test%';
DELETE FROM vendors WHERE business_name ILIKE '%Test%';
```

## Best Practices

1. **Always use test prefixes** - "Test" or "E2E" in all test data names
2. **Always use test emails** - `emailtest-{id}@test.com` or `test@example.com`
3. **Always cleanup after tests** - Use `test.afterAll()` hooks
4. **Monitor test data** - Regularly check for leftovers using SQL queries
5. **Use Stripe test mode** - Never use live Stripe keys in tests
6. **Document special cases** - If test data can't use standard patterns, document why

## Integration with CI/CD

The cleanup system integrates with GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npx playwright test
  # Cleanup runs automatically via global-teardown.ts
```

The `global-teardown.ts` script ensures cleanup runs even if tests fail.

## Architecture

```
Test Run
  ↓
Create Test Data (with "Test"/"E2E" prefix or test@ email)
  ↓
Run Tests
  ↓
Global Teardown / Cleanup Test / Manual Cleanup
  ↓
Invoke cleanup-test-data-unified
  ↓
  ├─ Email Strategy: Match by emailPrefix
  ├─ E2E Strategy: Match by namePatterns
  ↓
13-Table Cascade Cleanup
  ↓
Delete Auth Users (cascade remaining)
  ↓
Clean Database ✅
```

## Related Documentation

- `docs/EMAIL_TESTING_SYSTEM_COMPLETE.md` - Email testing system details
- `docs/MASTER_SYSTEM_DOCS.md` - System overview (AUTOMATED_TESTING section)
- `tests/utils/cleanup-helpers.ts` - Cleanup utility functions
- `supabase/functions/cleanup-test-data-unified/index.ts` - Unified cleanup implementation