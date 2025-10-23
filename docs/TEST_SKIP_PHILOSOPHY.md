# Test Skip Philosophy - When Skipping Is NEVER Acceptable

## CRITICAL PRINCIPLE: No Skipped Tests Without Fixing Root Cause ❌

**The fundamental rule**: If a test is skipping, we MUST address the precondition that causes it to skip. Skipped tests indicate one of two things:
1. **Missing preconditions** - The test environment lacks required data or setup
2. **Implementation issues** - The feature the test expects doesn't actually exist or work

Both require immediate action, not acceptance.

---

## Why Skipped Tests Are Harmful

### They Hide Real Problems
- A skipped test might indicate missing functionality
- Environmental issues that affect real users could go undetected  
- Database seeding problems mask integration issues
- Feature gaps remain undiscovered

### They Decay Over Time
- Skipped tests become forgotten
- No one remembers why they were skipped
- The codebase changes, making old skips irrelevant
- They clutter test output with false information

### They Provide False Security
- Test suite appears comprehensive but isn't
- Coverage metrics are misleading
- CI/CD passes don't reflect actual quality
- Bugs slip through "tested" code

---

## The Correct Approach

### Step 1: Identify the Root Cause
When you encounter a skipped test:
```typescript
// ❌ WRONG - Hiding the problem
test('some feature', async () => {
  if (!someCondition) {
    test.skip();
    return;
  }
  // test code
});

// ✅ CORRECT - Exposing the problem
test('some feature', async () => {
  if (!someCondition) {
    throw new Error('PRECONDITION FAILED: someCondition not met. This indicates [specific issue that must be fixed].');
  }
  // test code
});
```

### Step 2: Fix the Precondition
Based on what's missing:

**Missing seed data?**
- Update seed-email-test-data function to create required data
- Ensure the seed function is called correctly in test setup
- Verify data relationships are properly established

**Feature not implemented?**
- If the feature EXISTS but tests can't find it: Fix the test selectors
- If the feature DOESN'T exist: Either implement it or remove the tests
- Document why the feature isn't available if it's intentionally delayed

**Environmental issue?**
- Ensure test environment has all required configuration
- Fix database schema issues
- Address authentication or permissions problems

### Step 3: Document the Learning
Every time you fix a skipped test, document:
- What was causing the skip
- What you changed to fix it
- How to prevent similar issues in the future

Add to `docs/TEST_FIXES_[DATE].md` with:
- Root cause analysis
- Solution implemented
- Verification that tests now pass
- Any patterns to follow going forward

---

## Current Test Status

**Zero skipped tests are acceptable** ✅

All tests should either:
1. **Pass** - The feature works and is properly tested
2. **Fail** - There's a bug that needs fixing (expected during development)

Never:
3. ~~Skip~~ - This hides problems instead of solving them

---

## Examples of Correct Fixes

### Example 1: Email Tests Missing Admin User
**Before** (hiding the problem):
```typescript
test('notification test', async () => {
  test.skip(!adminUserId, 'No admin user found');
  // test code
});
```

**After** (exposing and fixing):
```typescript
// In test file:
test('notification test', async () => {
  if (!adminUserId) {
    throw new Error('PRECONDITION FAILED: Admin user not created by seed function. Check seed-email-test-data.');
  }
  // test code
});

// In seed function:
if (includeAdmin) {
  testUsers.admin = {
    email: `${emailPrefix}-admin@test.com`,
    password: 'TestPassword123!',
    role: 'admin'
  };
}
```

### Example 2: Missing Database Relationships
**Before** (hiding the problem):
```typescript
test('approval notification', async () => {
  const { data: links } = await getLinks();
  if (!links || links.length === 0) {
    test.skip();
    return;
  }
  // test code
});
```

**After** (exposing and fixing):
```typescript
test('approval notification', async () => {
  const { data: links } = await getLinks();
  if (!links || links.length === 0) {
    throw new Error('PRECONDITION FAILED: No guardian-bestie links found. The seed function should create these.');
  }
  // test code
});

// Then fix seed function to ensure links are created
```

### Example 3: Feature Implementation Check
**Before** (accepting incomplete feature):
```typescript
test('sticker collection', async ({ page }) => {
  const stickerTab = page.locator('[role="tab"]').filter({ hasText: /Sticker/i });
  const hasTab = await stickerTab.isVisible().catch(() => false);
  
  if (!hasTab) {
    test.skip(); // Feature not implemented
    return;
  }
  // test code
});
```

**After** (demanding proper implementation):
```typescript
test('sticker collection', async ({ page }) => {
  const stickerTab = page.locator('[role="tab"]').filter({ hasText: /Sticker/i });
  const hasTab = await stickerTab.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!hasTab) {
    throw new Error('PRECONDITION FAILED: Stickers tab does not exist. Confirmed it should be in Admin.tsx line 253.');
  }
  await expect(stickerTab).toBeVisible();
  // test code
});

// Then either:
// 1. Fix the test selector to find the existing tab, OR
// 2. Actually implement the missing feature, OR  
// 3. Remove the test if the feature is not planned
```

### Example 4: Test Dependencies
**Before** (tests depend on each other):
```typescript
test('create product', async () => {
  const product = await createProduct();
  testProductId = product.id;
});

test('edit product', async () => {
  if (!testProductId) {
    test.skip(); // Depends on previous test
    return;
  }
  // test code using testProductId
});
```

**After** (independent tests):
```typescript
test('edit product', async () => {
  // Create product if needed instead of depending on other test
  if (!testProductId) {
    const product = await createTestProduct();
    testProductId = product.id;
  }
  // test code using testProductId
});
```

---

## Implementation Checklist

When you see a skipped test:

- [ ] Identify what precondition is missing
- [ ] Determine if it's a seed data, feature, or environment issue  
- [ ] Fix the root cause (update seed function, fix selectors, or implement feature)
- [ ] Replace `test.skip()` with explicit error throwing
- [ ] Run the test to verify it now passes
- [ ] Document the fix in TEST_FIXES docs
- [ ] Update patterns in TESTING_BEST_PRACTICES if needed

---

## Related Documentation

- **TEST_FIXES_2025_10_23.md**: Recent test fixes and learnings
- **TESTING_BEST_PRACTICES.md**: General testing guidelines  
- **TEST_PHILOSOPHY in MASTER_SYSTEM_DOCS.md**: Core testing principles
- **AUTOMATED_TESTING_SYSTEM.md**: Complete testing infrastructure
