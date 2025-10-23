# Test Skip Philosophy - When Skipping Is Correct

## Core Principle: Conditional Skips Are Good, Arbitrary Skips Are Bad ✅

**CORRECT** skipping patterns:
- ✅ Skip when required data doesn't exist
- ✅ Skip when feature isn't implemented yet
- ✅ Skip when environment prerequisites aren't met
- ✅ Skip in specific contexts (e.g., email tests without service key)

**WRONG** skipping patterns:
- ❌ Skip because test is "flaky"
- ❌ Skip to make CI pass
- ❌ Skip without clear condition
- ❌ Skip without documentation

---

## Legitimate Skipped Tests in Our Codebase

### 1. Contact Form Notifications (5 skips)
**File**: `tests/e2e/contact-form-notifications.spec.ts`
**Reason**: Tests require admin user in database
**Pattern**:
```typescript
test('new submission creates notification', async ({ page }) => {
  test.skip(!adminUserId, 'No admin user found');
  // Test continues only if admin exists
});
```

**Why This Is Correct**: ✅
- Tests check notification functionality requiring admin
- Gracefully skips in test environments without seeded admin
- Provides clear reason for skip
- Test will run when condition is met

### 2. Email Approvals (4 skips)
**File**: `tests/e2e/email-approvals.spec.ts`
**Reason**: Tests require specific database relationships
**Patterns**:
```typescript
// Skip if no guardian-bestie links with approval required
if (!links || links.length === 0) {
  console.log('⚠️ No guardian-bestie links with post approval found');
  test.skip();
  return;
}
```

**Why This Is Correct**: ✅
- Checks for required data before running
- Logs warning for debugging
- Prevents false failures
- Production parity - tests actual approval workflows

### 3. Email Sponsorship Receipts (5 skips)
**File**: `tests/e2e/email-sponsorship-receipts.spec.ts`
**Reason**: Tests require active sponsorships in database
**Patterns**:
```typescript
if (!sponsorships || sponsorships.length === 0) {
  console.log('⚠️ No active monthly sponsorships found');
  test.skip();
  return;
}
```

**Why This Is Correct**: ✅
- Verifies email receipt generation requires real data
- Skips gracefully in empty test DB
- Clear messaging about what's missing
- Tests run when sponsorships exist

### 4. Sticker Collection (17 skips)
**File**: `tests/e2e/sticker-collection.spec.ts`
**Reason**: Feature not fully implemented
**Pattern**:
```typescript
if (await page.locator('[role="tab"]').filter({ hasText: /Stickers/i }).count() > 0) {
  // Test implementation
} else {
  test.skip(); // Feature not yet implemented
}
```

**Why This Is Correct**: ✅
- Tests exist for planned feature
- Skip with clear reason
- Tests will automatically run when feature ships
- Prevents test suite from failing during development

### 5. Vendor Dashboard CRUD (3 skips)
**File**: `tests/e2e/vendor-dashboard-crud.spec.ts`
**Reason**: Tests depend on product created in earlier test
**Pattern**:
```typescript
if (!testProductId) {
  test.skip();
  return;
}
```

**Why This Is Correct**: ✅
- Tests have dependencies on earlier test results
- Skip prevents cascading failures
- Clear prerequisite checking

---

## How to Identify Bad Skips vs. Good Skips

### Good Skip Checklist ✅

A skip is **GOOD** if it meets ALL criteria:
1. ✅ Has a clear condition check (if statement)
2. ✅ Includes descriptive skip reason
3. ✅ Logs warning/info about why skipping
4. ✅ Test would pass if condition were met
5. ✅ Condition is external (data, feature, environment)

**Example of Good Skip**:
```typescript
test('should send receipt email', async ({ page }) => {
  const { data: sponsorships } = await supabase
    .from('sponsorships')
    .select('*')
    .eq('is_active', true);
    
  if (!sponsorships || sponsorships.length === 0) {
    console.log('⚠️ No active sponsorships found - skipping receipt test');
    test.skip();
    return;
  }
  
  // Test implementation
});
```

### Bad Skip Red Flags ❌

A skip is **BAD** if ANY are true:
1. ❌ No condition - always skips
2. ❌ Reason is "flaky" or "sometimes fails"
3. ❌ Skip added to make CI pass
4. ❌ No documentation of why
5. ❌ Condition is test bug, not external factor

**Example of Bad Skip**:
```typescript
// ❌ WRONG - Hiding a broken test
test.skip('user can submit form', async ({ page }) => {
  // This test is flaky so we skip it
  await page.click('#submit');
  await expect(page.locator('.success')).toBeVisible();
});
```

**How to Fix**: Find and fix the root cause (timing issue, selector problem, etc.)

---

## When You Encounter a Skipped Test

### As a Developer:

**DO** ✅:
1. Read the skip condition
2. Understand why it's skipping
3. If fixing a related issue, check if test can now run
4. Remove skip when feature/data is available

**DON'T** ❌:
1. Remove skip without fixing underlying issue
2. Add more arbitrary skips
3. Assume skip means "broken test"
4. Ignore skipped tests entirely

### As a Code Reviewer:

**Approve** ✅ if skip has:
- Clear condition
- Descriptive reason
- Console log
- External dependency

**Reject** ❌ if skip:
- Has no condition
- Says "flaky" or "todo"
- Added to make CI green
- No explanation

---

## Summary: Current Test Status

**Total Skipped Tests**: 34
- Contact Form Notifications: 5 (conditional)
- Email Approvals: 4 (conditional)
- Email Sponsorship Receipts: 5 (conditional)
- Sticker Collection: 17 (feature not implemented)
- Vendor Dashboard: 3 (conditional)

**All skips are legitimate** ✅

**Tests Fixed in Latest Run**:
- navigation.spec.ts: Template literal syntax (fixed)
- VideoSection.test.tsx: Missing import (fixed)

**No arbitrary skips found** ✅

---

## Related Documentation

- **TEST_FIXES_2025_10_23.md**: Details on recent test fixes
- **TESTING_BEST_PRACTICES.md**: General testing guidelines
- **TEST_PHILOSOPHY in MASTER_SYSTEM_DOCS.md**: Testing principles
