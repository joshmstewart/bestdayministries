# CRITICAL: Test Data Cleanup System

## ⚠️ CRITICAL ISSUE ADDRESSED

**Problem:** Test data (especially sponsor besties) was appearing in production, showing test content to real users in the live carousel.

**Impact:** 
- Test besties showing in sponsor carousel on homepage/community pages
- Cluttering admin portal with test data
- Unprofessional user experience
- Potential data leak concerns

## 🛡️ Defense Layers

### Layer 1: Defensive Filtering (Immediate Protection)

**File:** `src/components/SponsorBestieDisplay.tsx`

The component now filters out test data BEFORE displaying:

```typescript
// CRITICAL: Filter out test data to prevent test besties from showing in production
const filteredBesties = bestiesData?.filter(bestie => {
  const name = bestie.bestie_name?.toLowerCase() || '';
  // Exclude test data patterns
  return !name.includes('test') && 
         !name.includes('e2e') &&
         !name.includes('email test') &&
         name !== 'test bestie';
}) || [];
```

This ensures that even if test data exists in the database, it won't be shown to users.

### Layer 2: Enhanced Cleanup (Root Cause Fix)

**File:** `supabase/functions/cleanup-test-data-unified/index.ts`

Added comprehensive cleanup for `sponsor_besties` table:

```typescript
// CRITICAL: Also delete sponsor_besties by name pattern (test data may not have user_id)
if (namePatterns.length > 0) {
  for (const pattern of namePatterns) {
    const { error: sponsorBestiePatternError } = await supabaseAdmin
      .from('sponsor_besties')
      .delete()
      .ilike('bestie_name', `%${pattern}%`);
    
    if (sponsorBestiePatternError) {
      console.error(`Error deleting sponsor_besties with pattern ${pattern}:`, sponsorBestiePatternError);
    } else {
      console.log(`✅ Deleted sponsor_besties with pattern: ${pattern}`);
    }
  }
}
```

### Layer 3: Reliable Test Cleanup

**Files:** 
- `tests/e2e/cleanup.spec.ts` - Final cleanup with retries
- `tests/e2e/sponsorship.spec.ts` - Per-test cleanup
- `tests/utils/test-cleanup-guard.ts` - Reusable cleanup utilities

**Key Improvements:**

1. **Retry Logic**: Cleanup attempts up to 3 times if it fails
2. **afterEach Hooks**: Cleanup runs after EACH test, not just afterAll
3. **Broader Patterns**: Matches 'Test', 'E2E', 'test', 'e2e', 'Email Test'

## 📋 Implementation Checklist

### For New Tests

When creating tests that create data visible to users:

- [ ] Use test naming patterns: "Test", "E2E", etc.
- [ ] Add `afterEach` cleanup hook
- [ ] Import and use `setupCleanupGuard` from test-cleanup-guard.ts
- [ ] Test locally that data is cleaned up

Example:
```typescript
import { setupCleanupGuard } from '../utils/test-cleanup-guard';

test.describe('My Feature', () => {
  test.afterEach(async ({ page }) => {
    await setupCleanupGuard(page, {
      namePatterns: ['Test', 'E2E']
    });
  });
  
  test('should do something', async ({ page }) => {
    // Test creates data with "Test" in the name
  });
});
```

### For Existing Tests

Priority order for fixes:

1. **High Priority** (Visible to Users):
   - ✅ Sponsorship tests
   - Featured bestie tests
   - Discussion post tests
   - Event tests

2. **Medium Priority** (Admin Only):
   - Newsletter tests
   - Vendor tests
   - Product tests

3. **Low Priority** (Internal):
   - Settings tests
   - Profile tests

## 🔍 Monitoring & Verification

### Check for Test Data Leakage

Run this query in the backend database to check for test data:

```sql
-- Check sponsor_besties
SELECT * FROM sponsor_besties 
WHERE bestie_name ILIKE '%test%' 
   OR bestie_name ILIKE '%e2e%';

-- Check featured_besties
SELECT * FROM featured_besties 
WHERE bestie_name ILIKE '%test%' 
   OR bestie_name ILIKE '%e2e%';

-- Check discussion_posts
SELECT * FROM discussion_posts 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%e2e%';
```

### Before Test Run

Use the verification utility:

```typescript
import { verifyNoTestData } from '../utils/test-cleanup-guard';

test.beforeAll(async ({ page }) => {
  const isClean = await verifyNoTestData(page);
  if (!isClean) {
    console.warn('⚠️  Test data found before tests started!');
    // Optionally run cleanup here
  }
});
```

## 🚨 Emergency Cleanup

If test data appears in production:

1. **Immediate**: Use Admin Panel "Clean Test Data" button
2. **Manual**: Run cleanup edge function directly
3. **Database**: Use SQL queries above to manually delete

## 📊 Success Criteria

- [ ] No test besties in sponsor carousel
- [ ] Admin portal shows only real data
- [ ] All tests pass cleanup verification
- [ ] No test data persists after test runs

## 🔄 Continuous Improvement

### Future Enhancements

1. **Automated Monitoring**: Add alerting if test data is detected in production
2. **Pre-deployment Checks**: Verify no test data before deployments
3. **Test Data Tagging**: Add metadata field to mark test data explicitly
4. **Cleanup Metrics**: Track cleanup success rate and failures

### Test Data Patterns

Always use these patterns for test data:
- Names: "Test X", "E2E X", "Email Test X"
- Emails: "test@example.com", "emailtest-*@test.com"
- Titles: "Test Title", "E2E Post"

Avoid:
- Generic names without "test" marker
- Real-looking names
- Production-like email addresses

## 🎯 Priority Statement

**Test data cleanup is MORE important than test pass rate.**

It's better to have:
- 90% passing tests with clean production data
- Than 100% passing tests with test data leaking to users

When in doubt, choose cleanup reliability over test reliability.
