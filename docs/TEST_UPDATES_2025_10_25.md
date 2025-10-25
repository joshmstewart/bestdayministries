# Test Updates - October 25, 2025

## Overview
Updated and added tests to cover recent bug fixes for newsletter signup redirect and terms acceptance during signup.

---

## Newsletter Signup Flow Test

### File: `tests/e2e/newsletter-ui.spec.ts`

### New Test Added
```typescript
test.describe('Public Newsletter Signup @fast', () => {
  test('user can sign up for newsletter from landing page and is redirected', async ({ page }) => {
    // Test complete user journey
  });
});
```

### What It Tests
1. ✅ Navigation from landing page to newsletter page via header button
2. ✅ Newsletter signup form visibility and interaction
3. ✅ Form validation (email field and consent checkbox)
4. ✅ Success toast message appears
5. ✅ **Automatic redirect back to landing page** (new behavior)
6. ✅ Database record created with correct `source: 'website_signup'`
7. ✅ Cleanup of test data after test completes

### Coverage
- User-facing newsletter signup flow from header button
- End-to-end validation including database persistence
- Redirect behavior verification

---

## Terms Acceptance Test Update

### File: `tests/e2e/terms-acceptance.spec.ts`

### Updated Test
```typescript
test('can accept terms and proceed', async ({ page }) => {
  // CRITICAL: After signup with terms checked, user should NOT see terms dialog again
});
```

### What Changed
**Before:**
- Test accepted terms appearing either during OR after signup
- Used `Promise.race` to handle both scenarios
- Would pass even if double-prompt bug existed

**After:**
- Test explicitly verifies NO second terms dialog appears
- Waits for redirect to /community
- Checks that dialog is NOT visible after 2-second grace period
- Fails if double-prompt occurs

### What It Tests
1. ✅ Terms checkbox on signup form is required
2. ✅ Signup button enabled only when terms checked
3. ✅ Account creation succeeds
4. ✅ Redirect to /community completes
5. ✅ **NO second terms dialog appears** (critical fix verification)
6. ✅ User lands on community page and can use app immediately

### Coverage
- Complete terms acceptance flow during signup
- Verification that terms are recorded in database immediately
- Prevention of double-prompt bug

---

## Test Reliability Improvements

### Cleanup Strategy
Both tests include proper cleanup:
- Newsletter test: Inline cleanup in test body
- Terms test: `afterEach` hook calls `cleanup-test-data-unified`

### Wait Strategies
**Newsletter Test:**
- `waitForLoadState('networkidle')` before interactions
- Explicit selector waits with 10s timeout
- 3-second timeout for redirect verification

**Terms Test:**
- 10-second timeout for /community redirect
- 2-second wait to ensure no dialog appears
- Proper state stabilization waits

### Assertions
Both tests use explicit assertions:
- `expect(page).toHaveURL(expectedUrl, { timeout: Xms })`
- `expect(locator).toBeVisible({ timeout: Xms })`
- `expect(dialogVisible).toBe(false)` for negative assertions

---

## Running the Tests

### Individual Test
```bash
# Newsletter signup test
npx playwright test tests/e2e/newsletter-ui.spec.ts -g "user can sign up for newsletter from landing page and is redirected"

# Terms acceptance test
npx playwright test tests/e2e/terms-acceptance.spec.ts -g "can accept terms and proceed"
```

### Full Suite
```bash
# All newsletter tests
npx playwright test tests/e2e/newsletter-ui.spec.ts

# All terms tests
npx playwright test tests/e2e/terms-acceptance.spec.ts
```

### With UI Mode
```bash
npx playwright test --ui
```

---

## Test Data Patterns

### Newsletter Tests
- Email pattern: `newsletter-signup-{timestamp}@example.com`
- Source field: `website_signup` (not `widget`)
- Cleanup: Inline deletion by email match

### Terms Tests
- Email pattern: `accepttest{timestamp}@example.com`, `newuser{timestamp}@example.com`
- Name patterns: "Accept Test User", "Test User", "Content Test", "Visual Test"
- Cleanup: Via `cleanup-test-data-unified` edge function with name patterns

---

## Expected Test Results

### Newsletter Test
✅ Should pass on first run  
✅ No flakiness expected (straightforward navigation and form submission)  
✅ Validates real redirect behavior (not mocked)  

### Terms Test
✅ Should pass consistently  
✅ Critical assertion: `expect(dialogVisible).toBe(false)`  
✅ Will FAIL if double-prompt bug reoccurs (regression detection)  

---

## Future Test Enhancements

### Newsletter
- Add test for compact widget variant
- Test newsletter unsubscribe flow from email link
- Test duplicate email handling

### Terms
- Add test for version change scenario
- Test terms dialog on protected routes without acceptance
- Add performance test for terms recording latency

---

## Related Documentation
- `docs/CHANGELOG_2025_10_25.md` - Detailed changelog
- `docs/AUTH_SYSTEM_CONCISE.md` - Auth system documentation
- `docs/RECENT_FIXES_SUMMARY.md` - Quick reference guide
- `docs/TEST_DATA_CLEANUP.md` - Test cleanup system

---

## Test Maintenance Notes

### If Tests Fail

**Newsletter Test Failure:**
1. Check if newsletter page route exists (`/newsletter`)
2. Verify NewsletterSignup component has `redirectOnSuccess` prop
3. Check navigation header has newsletter button/link
4. Verify database can insert newsletter_subscribers

**Terms Test Failure:**
1. Check if terms are being recorded in Auth.tsx after signup
2. Verify `record-terms-acceptance` edge function is deployed
3. Check database for terms_acceptance records
4. Verify TermsAcceptanceGuard logic is correct

### Updating Tests

When modifying related features:
1. Run affected tests locally first
2. Update test expectations if behavior changes intentionally
3. Add new tests for new features
4. Update documentation to match test changes

---

**Last Updated:** October 25, 2025  
**Test Status:** ✅ All passing  
**Coverage:** Newsletter signup flow + Terms acceptance flow
