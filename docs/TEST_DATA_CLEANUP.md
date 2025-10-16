# Test Data Cleanup System

## Overview
Automatic cleanup system that removes test data after E2E tests complete.

## Features

### 1. Automatic Cleanup
- **Edge Function**: `cleanup-test-data` removes all test data
- **Test Runner**: Cleanup test runs after all E2E tests
- **Pattern Matching**: Identifies test data by naming patterns

### 2. Cleanup Patterns
Test data is identified by:
- **Names**: Contains "Test", "test", or "E2E"
- **Emails**: Contains "test@"
- **Metadata**: Tagged with `is_test_data: true`

### 3. What Gets Cleaned
- ✅ Test profiles
- ✅ Test sponsorships  
- ✅ Test featured besties
- ✅ Test discussion posts
- ✅ Test vendors
- ✅ Related comments, assets, and links

## Manual Cleanup

### Via Admin Panel
Create an admin tool that calls the cleanup function:

```typescript
const { data, error } = await supabase.functions.invoke('cleanup-test-data', {
  body: {
    removeTestProfiles: true,
    removeTestSponsorships: true,
    removeTestBesties: true,
    removeTestPosts: true,
    removeTestVendors: true,
  }
});
```

### Via Database
Direct SQL query:
```sql
-- Remove test sponsorships
DELETE FROM sponsorships 
WHERE sponsor_id IN (SELECT id FROM profiles WHERE display_name LIKE '%Test%')
   OR bestie_id IN (SELECT id FROM profiles WHERE display_name LIKE '%Test%');

-- Remove test featured besties
DELETE FROM featured_besties 
WHERE bestie_name ILIKE '%Test%' OR bestie_name ILIKE '%E2E%';

-- Remove test discussion posts
DELETE FROM discussion_posts 
WHERE title ILIKE '%Test%' OR title ILIKE '%E2E%';

-- Remove test vendors
DELETE FROM vendors 
WHERE business_name ILIKE '%Test%' OR business_name ILIKE '%E2E%';

-- Remove test profiles (do last)
DELETE FROM profiles 
WHERE display_name ILIKE '%Test%' OR display_name ILIKE '%E2E%' OR email ILIKE '%test@%';
```

## Test Writing Guidelines

### Naming Convention
Always prefix test data with "Test" or "E2E":

```typescript
// ✅ Good
const testUser = { display_name: 'Test Sponsor' };
const testBestie = { name: 'Test Bestie' };

// ❌ Bad
const user = { display_name: 'John Doe' };
const bestie = { name: 'Sarah' };
```

### Using Cleanup Helpers

```typescript
import { markAsTestData, generateTestName } from '../utils/cleanup-helpers';

// Mark data as test data
const metadata = markAsTestData({ source: 'e2e-test' });

// Generate test name
const name = generateTestName('Bestie'); // Returns "Test Bestie"
```

### Cleanup in Tests

```typescript
import { test } from '@playwright/test';
import { cleanupTestData } from '../utils/cleanup-helpers';

test.describe('My Feature', () => {
  // Cleanup after this test suite
  test.afterAll(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('should do something', async ({ page }) => {
    // Test code here
  });
});
```

## Preventing Test Data Leaks

### 1. Always Use Test Prefixes
- Profiles: "Test Guardian", "Test Bestie"
- Besties: "Test Bestie", "E2E Bestie"
- Posts: "Test Post", "E2E Discussion"
- Vendors: "Test Vendor"

### 2. Use Test Email Addresses
```typescript
const email = `test-${Date.now()}@test.com`;
```

### 3. Stripe Test Mode
Ensure tests use Stripe test mode:
```typescript
stripe_mode: 'test'
```

## Monitoring

### Check for Leftover Test Data
```sql
-- Count test profiles
SELECT COUNT(*) FROM profiles 
WHERE display_name ILIKE '%Test%' OR email ILIKE '%test@%';

-- Count test sponsorships
SELECT COUNT(*) FROM sponsorships s
JOIN profiles p ON s.sponsor_id = p.id OR s.bestie_id = p.id
WHERE p.display_name ILIKE '%Test%';

-- Count test besties
SELECT COUNT(*) FROM featured_besties 
WHERE bestie_name ILIKE '%Test%';
```

### Automated Cleanup Schedule
Consider adding a cron job to clean up old test data:
```sql
-- In a scheduled function
DELETE FROM profiles 
WHERE (display_name ILIKE '%Test%' OR email ILIKE '%test@%')
AND created_at < now() - interval '7 days';
```

## Troubleshooting

### Test Data Not Cleaning Up
1. Check naming conventions match patterns
2. Verify edge function is deployed
3. Check for foreign key constraints
4. Review RLS policies

### Manual Cleanup Needed
If automated cleanup fails:
1. Use manual SQL queries above
2. Check database logs for errors
3. Verify service role permissions
4. Run cleanup test manually

## Best Practices

1. **Always prefix test data** with "Test" or "E2E"
2. **Use test email addresses** (`test@`, `e2e@`)
3. **Clean up after each test suite** when possible
4. **Run cleanup test** as final E2E test
5. **Monitor for leaked data** regularly
6. **Use Stripe test mode** for all test payments
7. **Document test data patterns** in test files

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: npx playwright test

- name: Cleanup Test Data
  run: npx playwright test tests/e2e/cleanup.spec.ts
  if: always()
```

This ensures cleanup runs even if tests fail.
