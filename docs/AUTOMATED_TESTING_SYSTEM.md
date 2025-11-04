# Automated Testing System (Option 1 - Basic)

## Overview
The application includes automated end-to-end (E2E) testing using Playwright that runs on every push/PR via GitHub Actions. Test results are automatically logged to the database and viewable in the Admin dashboard.

**NOTE:** For the full testing suite including unit tests and visual regression, see [TESTING_OPTION_2.md](./TESTING_OPTION_2.md).

## Components

### 1. Test Framework (Playwright)
- **Config**: `playwright.config.ts`
- **Tests**: 
  - `tests/e2e/basic.spec.ts` - Basic navigation and page loads
  - `tests/e2e/auth.spec.ts` - Comprehensive signup/login tests for all roles
  - `tests/e2e/guardian-linking.spec.ts` - Friend code linking and role verification
  - `tests/e2e/vendor-linking.spec.ts` - Vendor-bestie linking and approval flow
  - `tests/e2e/discussions.spec.ts` - Discussion posts, comments, interactions
  - `tests/e2e/events-interactions.spec.ts` - Event details, dialog, location links
  - `tests/e2e/shopping-cart.spec.ts` - Marketplace products, store items, cart
  - `tests/e2e/notifications.spec.ts` - Notification bell, center page, filtering
  - `tests/e2e/video.spec.ts` - Video players, YouTube embeds, controls
  - `tests/e2e/help-center.spec.ts` - Tours, guides, FAQs, search
  - `tests/e2e/performance.spec.ts` - Load times, Core Web Vitals (@slow tag)
  - Other E2E tests for forms, community, store, etc.
- **Browsers**: Chrome, Firefox, Safari
- **Features**: Screenshots on failure, retries on CI, HTML reports, test tags (@fast/@slow)

### 2. GitHub Actions Workflow
- **File**: `.github/workflows/test.yml`
- **Triggers**: Manual workflow dispatch with optional test suites
- **Jobs**:
  1. **unit-tests**: Vitest with coverage (if enabled)
  2. **e2e-tests**: Playwright across 4 shards, excludes visual tests (if enabled)
  3. **visual-tests**: Percy snapshots, requires PERCY_TOKEN (if enabled)
  4. **log-results**: Aggregates and logs all results to database
- **Artifacts**: Test reports and coverage stored for 30 days

### 3. Database Logging
- **Table**: `test_runs`
- **Edge Function**: `github-test-webhook`
- **Fields**: status, workflow_name, commit_sha, branch, duration, run_url, etc.

### 4. Admin Dashboard
- **Location**: Admin → Testing tab
- **Features**: 
  - Real-time test run history
  - Status badges (✓ success, ✗ failure, ⏱ pending)
  - Commit info and messages
  - Duration tracking
  - Direct links to GitHub logs
  - Auto-refresh on new runs

## Setup

### GitHub Repository Secrets
Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. `VITE_SUPABASE_URL` - Your Supabase project URL
2. `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
3. `PERCY_TOKEN` - (Optional) Percy.io token for visual regression tests

### Test Account Setup (Required)
**CRITICAL**: Visual and E2E tests require a test account to access authenticated pages.

1. Create a test user in your app:
   - Email: `test@example.com`
   - Password: `testpassword123`
2. Assign appropriate roles (supporter, caregiver, etc.)
3. This account is used by Percy and E2E tests to log in automatically

### First Test Run
1. Create test account (see above)
2. Commit and push code to trigger workflow
3. Go to GitHub → Actions to see test execution
4. Check Admin → Testing tab to see logged results

## Writing Tests

### Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Expected Title/);
  });
});
```

### Best Practices

#### General Practices
- Group related tests with `test.describe()`
- Use clear, descriptive test names
- Test critical user journeys first
- Keep tests independent and isolated
- Use proper selectors (prefer role/text over class names)

#### Waiting Strategies (CRITICAL for reliability)
**Problem**: Tests fail because content hasn't loaded when assertions run.

**Solution**: Implement layered waiting strategy:
1. **Wait for navigation/tab**: `await page.click('tab'); await page.waitForLoadState('networkidle');`
2. **Wait for section heading**: `await page.waitForSelector('text=/Section Name/i', { timeout: 15000, state: 'visible' });`
3. **Wait for card/component**: `await page.waitForSelector('text=/Component Title/i', { timeout: 10000, state: 'visible' });`
4. **Wait for interactive elements**: `await button.waitFor({ state: 'visible', timeout: 5000 });`

**AVOID**: `waitForTimeout()` - creates flaky tests. Always prefer `waitForSelector()` with specific targets.

#### Selector Best Practices
**Problem**: Generic selectors match wrong elements or fail when text changes.

**Solution**: Verify exact component text before writing tests:
1. **View the component code** to find exact button text, headings, labels
2. **Use specific patterns**: `hasText: /Send Link Request/i` instead of `/link.*bestie|send.*request/i`
3. **Layer specificity**: `page.locator('button').filter({ hasText: /Exact Text/i })`

**Example from vendor-linking tests**:
```typescript
// ❌ FLAKY - Generic pattern, no waiting
const button = page.locator('button').filter({ hasText: /link|submit/i }).first();
await button.click();

// ✅ RELIABLE - Layered waits, exact text
await page.waitForSelector('text=/Link to Besties/i', { timeout: 15000, state: 'visible' });
await page.waitForSelector('text=/Link Your Store to a Bestie/i', { timeout: 10000, state: 'visible' });
const button = page.locator('button').filter({ hasText: /Send Link Request/i });
await button.waitFor({ state: 'visible', timeout: 5000 });
await button.click();
```

#### Tab Content Loading
**Problem**: Clicking a tab doesn't guarantee content is rendered.

**Solution**: Always wait for specific content within the tab:
```typescript
await page.getByRole('tab', { name: /settings/i }).click();
// ❌ await page.waitForTimeout(1000); // Flaky!
// ✅ Wait for actual content
await page.waitForSelector('text=/Section Heading/i', { timeout: 15000, state: 'visible' });
```

### 🚨 CRITICAL: Authenticating Supabase Clients in Tests

**PRODUCTION BUG CAUSED BY THIS**: A real user received fake notifications about comments on posts they never made because test code created content under their user ID.

#### The Problem

When creating Supabase clients in E2E tests for data seeding or cleanup, calling `getUser()` on an **unauthenticated client** can return:
- `null` (best case - test fails cleanly)
- A stale session from the environment
- **A REAL USER'S SESSION** (worst case - creates fake data for real users!)

This causes:
1. Test posts/comments created under real user IDs
2. Database triggers fire notifications to real users
3. Real users receive notifications about test content that doesn't exist

#### ❌ WRONG Pattern - DO NOT DO THIS

```typescript
import { createClient } from '@supabase/supabase-js';

// Seed test data in beforeAll hook
test.beforeAll(async () => {
  // ❌ Creating client without authentication
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );

  // ❌ This could return a REAL USER'S ID!
  const { data: { user } } = await supabase.auth.getUser();

  // ❌ Test data created under real user's ID
  await supabase.from('discussion_posts').insert({
    author_id: user.id, // ← Could be a real user!
    title: 'E2E Test Post',
    content: 'Test content'
  });
  
  // Result: Real user gets fake notifications!
});
```

#### ✅ CORRECT Pattern - Always Authenticate First

```typescript
import { createClient } from '@supabase/supabase-js';
import { getTestAccount, verifyTestAccount } from '../fixtures/test-accounts';

test.beforeAll(async () => {
  // Create Supabase client
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );

  // ✅ ALWAYS authenticate with test account FIRST
  const testAccount = getTestAccount();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testAccount.email,
    password: testAccount.password
  });

  if (signInError) {
    throw new Error(`Failed to authenticate: ${signInError.message}`);
  }

  console.log(`✅ Authenticated as ${testAccount.email} for data seeding`);

  // NOW it's safe to use getUser()
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();

  // ✅ Verify it's actually a test account
  verifyTestAccount(session?.user?.email);

  // Safe to create test data now
  await supabase.from('discussion_posts').insert({
    author_id: user.id, // ← Will be a test account ID
    title: 'Test Post',
    content: 'Test content'
  });
});
```

#### ✅ BEST Practice: Use the Helper

For even safer and cleaner code, use the `createAuthenticatedTestClient()` helper:

```typescript
import { createAuthenticatedTestClient } from '../utils/test-helpers';

test.beforeAll(async () => {
  // ✅ Always authenticated, always verified
  const supabase = await createAuthenticatedTestClient();
  
  // Safe to use immediately - guaranteed to be test account
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.from('discussion_posts').insert({
    author_id: user.id, // Guaranteed to be a test account ID
    title: 'Test Post'
  });
});
```

#### Why This Matters

- **Real Impact**: This bug caused production issues with real users receiving fake notifications
- **Silent Failure**: Tests pass, but real users are affected hours/days later
- **Hard to Debug**: Fake notifications appear after test runs complete
- **Data Integrity**: Test data mixed with production data

#### Checklist for Test Data Seeding

- [ ] Create Supabase client
- [ ] **Sign in with test account credentials** ← NEVER SKIP THIS
- [ ] Get user/session
- [ ] **Verify it's a test account** using `verifyTestAccount()`
- [ ] Create test data
- [ ] Clean up in `afterAll` (also authenticated!)

#### Files Involved

- `tests/fixtures/test-accounts.ts` - Contains `verifyTestAccount()` function
- `tests/utils/test-helpers.ts` - Contains `createAuthenticatedTestClient()` helper
- `docs/TESTING_BEST_PRACTICES.md` - Complete documentation of the pattern
- `docs/TEST_AUTH_BUG_FIX_2025_11_04.md` - Full incident report and fix details

---

### Running Tests Locally
```bash
# Install browsers (first time only)
npx playwright install --with-deps

# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/basic.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui

# View last report
npx playwright show-report
```

---

## Email Testing Suite

### Overview
The project includes **22 specialized email tests** across 6 test files that verify email infrastructure via database state verification. These tests interact with the actual Resend email service and verify results by checking database tables.

### Running Email Tests

#### In CI/CD
Email tests are **disabled by default** to prevent unnecessary API usage. Enable via workflow dispatch:
1. Go to GitHub Actions
2. Select "Run Tests" workflow
3. Click "Run workflow"
4. Check "Run email tests" (run_email_tests: true)
5. Click "Run workflow"

#### Locally
```bash
# Run all email tests
npx playwright test tests/e2e/email-*.spec.ts --project=chromium

# Run specific email test file
npx playwright test tests/e2e/email-approvals.spec.ts

# Run tests with specific tag
npx playwright test --grep "@email @receipts"
```

### Test Categories (22 Tests Total)

#### 1. Approval Notifications (3 tests)
**File**: `tests/e2e/email-approvals.spec.ts`
- Post approval notification
- Comment approval notification
- Vendor asset approval notification

#### 2. Digest Emails (3 tests)
**File**: `tests/e2e/email-digest.spec.ts`
- Daily digest aggregation
- Weekly digest aggregation
- Digest respects user preferences

#### 3. Direct Notifications (4 tests)
**File**: `tests/e2e/email-notifications.spec.ts`
- Comment notification
- Sponsor message notification
- Product update notification
- Respects email preferences

#### 4. Sponsorship Receipts (4 tests)
**File**: `tests/e2e/email-sponsorship-receipts.spec.ts`
- Monthly sponsorship receipt
- One-time sponsorship receipt
- Receipt includes organization info
- Generate missing receipts

#### 5. Sponsor Messages (3 tests)
**File**: `tests/e2e/email-messages.spec.ts`
- Sponsor sends message to bestie
- Bestie sends message to sponsor
- Guardian sends message to sponsor

#### 6. Contact Form (5 tests)
**File**: `tests/e2e/email-contact-form-resend.spec.ts`
- Form submission saves to database
- Inbound email reply saves to database
- Admin reply updates submission status
- Email validation before saving
- Multiple replies create conversation thread

**Performance Notes:**
- Uses optimized single-query pattern for reply counts
- Tests verify no timeout errors when handling multiple submissions
- Prevents N+1 query problem with batch fetching

---

### Key Differences from E2E Tests

| Aspect | E2E Tests | Email Tests |
|--------|-----------|-------------|
| **CI Trigger** | Automatic (push/PR) | Manual (workflow_dispatch) |
| **Default State** | Enabled | Disabled (default: false) |
| **Sharding** | 4 shards | No sharding |
| **Browsers** | Chrome, Firefox, Safari | Chromium only |
| **Timeout** | 60 minutes | 45 minutes |
| **Parallelization** | Yes | No (shared auth clients) |
| **Setup Required** | Test account | Seed function + auth tokens |

### Why Email Tests Are Separate

1. **Cost Management**: Each test run makes real Resend API calls, which count against your Resend quota
2. **Longer Execution**: Tests include 5-second delays waiting for database state changes (notifications created, emails logged)
3. **Shared State**: Tests use authenticated clients from seed function and can't run in parallel
4. **External Dependencies**: Tests depend on Resend service availability and response times

### Test Data Setup

Email tests depend on the `seed-email-test-data` edge function, which is called in each test file's `beforeAll` hook:

**Creates**:
- 4 test users (guardian, bestie, sponsor, vendor)
- All required relationships (sponsorships, bestie links, vendor approvals)
- JWT access and refresh tokens for authenticated clients
- Receipt settings with known organization details ('Test Organization', '12-3456789')

**Returns**:
```typescript
{
  guardianUser: { userId, email, accessToken, refreshToken },
  bestieUser: { userId, email, accessToken, refreshToken },
  sponsorUser: { userId, email, accessToken, refreshToken },
  vendorUser: { userId, email, accessToken, refreshToken },
  testRunId: string,
  emailPrefix: string
}
```

### Test Patterns

#### Pattern 1: Production-Parity (Contact Form Tests)
Used for public-facing functionality that doesn't require authentication.

```typescript
import { waitForSubmission, simulateInboundEmail } from '../utils/resend-test-helper';

test('contact form submission', async ({ page }) => {
  // User fills form
  await page.goto('/');
  await page.fill('input[name="email"]', testEmail);
  await page.click('button[type="submit"]');
  
  // Verify submission in database
  const submission = await waitForSubmission(testEmail);
  expect(submission.email).toBe(testEmail);
});
```

#### Pattern 2: Authenticated Clients (All Other Email Tests)
Used for role-based functionality that requires specific permissions.

```typescript
// Create authenticated client with tokens from seed function
const guardianClient = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${guardianAccessToken}` } },
});

// Trigger action that sends email
await guardianClient
  .from('discussion_posts')
  .update({ approval_status: 'approved' })
  .eq('id', postId);

// Verify notification created in database
const { data: notification } = await guardianClient
  .from('notifications')
  .select('*')
  .eq('type', 'approval_decision')
  .single();

expect(notification).toBeTruthy();
```

### Documentation References

- **Complete System Reference**: `docs/EMAIL_TESTING_SYSTEM_COMPLETE.md`
  - Detailed database schema requirements
  - Edge function contracts
  - Seed function specifications
  - Common failure modes and troubleshooting

- **Production-Parity Pattern**: `docs/EMAIL_TESTING_PRODUCTION_PARITY.md`
  - Applies ONLY to 5 contact form tests
  - Database verification approach
  - Simulating inbound emails
  - Test helper utilities

### Performance Optimizations (Added 2025-10-15)

**Single-Query Pattern for Contact Form Counts:**
- **Problem**: Original implementation made 100+ individual database queries to count replies for each submission
- **Impact**: Caused timeout errors when deleting multiple submissions
- **Solution**: Fetch all replies in single query, filter/count client-side with JavaScript
- **Result**: Reduced from 100+ queries to 2-3 queries total
- **Files Updated**: 
  - `src/components/admin/ContactFormManager.tsx`
  - `src/hooks/useContactFormCount.ts`

**Benefits:**
- Eliminates connection timeout errors during bulk operations
- Real-time safe (efficient enough to run on every update)
- Better scalability (no N+1 query problem)
- Tests verify no regression of this optimization


### Troubleshooting

See `docs/EMAIL_TESTING_SYSTEM_COMPLETE.md` for detailed troubleshooting guidance, including:
- Email log inserts failing silently (now fixed with graceful error handling)
- Digest emails not respecting user preferences (now fixed with explicit check)
- Receipt organization name mismatches (now fixed with test data isolation)
- Seed function failures
- CI vs local test differences
- Missing database columns
- RLS policy issues

---

## Test Run Statuses

- **success**: All tests passed ✅
- **failure**: One or more tests failed ❌
- **pending**: Tests are currently running ⏱
- **cancelled**: Workflow was cancelled 🚫

## Monitoring

### Admin Dashboard
- View test history at `/admin?tab=testing`
- See real-time updates as tests run
- Click "View Logs" to see detailed GitHub Actions logs

### GitHub Actions
- View all workflow runs at: `https://github.com/[owner]/[repo]/actions`
- See detailed logs, artifacts, and timings
- Get email notifications on failures (configure in GitHub settings)

## Troubleshooting Common Test Failures

### Email Tests Failing with "Expected > 0, Received: 0"

**Symptom**: All email tests fail immediately with identical error about expected count > 0

**Root Cause**: The `seed-email-test-data` edge function cannot create test data because it lacks the `SUPABASE_SERVICE_ROLE_KEY` environment variable.

**Solution**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in GitHub Repository Secrets (Settings → Secrets → Actions)
2. Check that the workflow YAML includes the key in the seed step:
   ```yaml
   env:
     SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
   ```
3. Review edge function logs for "Missing service role key" error message

**Files to Check**:
- `.github/workflows/email-tests.yml` (seed test data step)
- Edge function: `supabase/functions/seed-email-test-data/index.ts`

**Why This Happens**: Edge functions that create users need service-level access to bypass RLS policies and use `auth.admin.createUser()`.

---

### E2E Tests Timing Out on Element Selectors

**Symptom**: Test times out after 60 seconds waiting for a button or UI element

**Root Cause**: Element doesn't exist due to:
- Missing admin-configured data
- User role restrictions (e.g., "Create Post" button only for guardians)
- Optional features not enabled

**Solution**: Add defensive check with shorter timeout

```typescript
// Instead of assuming element exists
// await page.locator('button:has-text("Action")').click(); // ❌ Times out

// Use defensive pattern
const button = await page.locator('button:has-text("Action")')
  .isVisible({ timeout: 5000 })
  .catch(() => false);

if (!button) {
  console.warn('⚠️ Action button not found - may be role-restricted');
  test.skip(); // Or continue with alternative assertion
} else {
  await page.locator('button:has-text("Action")').click();
}
```

**Prevention**: Use defensive test patterns (see `TESTING_BEST_PRACTICES.md`)

---

### Tests Fail Due to Missing Admin-Configured Data

**Symptom**: Tests expect videos, products, or content that don't exist in test environment

**Root Cause**: Test environment doesn't have admin-created content (videos, FAQs, tours, etc.)

**Solution**: Implement "Check-Both-States" pattern

```typescript
// Check for content OR empty state (both valid)
const hasVideos = await page.locator('video, iframe[src*="youtube"]').count() > 0;
const hasEmptyState = await page.locator('text=/no videos available/i')
  .isVisible({ timeout: 5000 })
  .catch(() => false);

// Assert EITHER populated or empty state
expect(hasVideos || hasEmptyState).toBeTruthy();
```

**Best Practice**: Always test both populated and empty states for admin-managed content.

---

### Tests Pass Locally but Fail in CI

**Symptom**: Tests work on local machine but fail in GitHub Actions

**Root Cause**: CI environments are 2-3x slower than local development machines

**Solution**:
1. Increase timeouts for CI:
   ```typescript
   // Local: 30s might be fine
   // CI: Need 60s for auth flows
   await page.waitForURL(/\/(community|admin)/, { timeout: 60000 });
   ```
2. Add intermediate waits in multi-step flows:
   ```typescript
   await page.click('button:has-text("Submit")');
   await page.waitForTimeout(2000); // Give CI time to process
   await page.waitForURL('/success', { timeout: 60000 });
   ```

**See**: `TESTING_BEST_PRACTICES.md` → "Timeout Guidelines" for recommended timeouts

---

### Persistent Test Accounts Not Found

**Symptom**: Tests fail because expected test accounts (testbestie@example.com, etc.) don't exist

**Root Cause**: Accounts haven't been created or were accidentally deleted

**Solution**:
1. Run `global-setup.ts` to create persistent accounts:
   ```bash
   npx playwright test --config=playwright.config.ts
   ```
2. Verify accounts exist in database:
   ```sql
   SELECT email FROM auth.users WHERE email LIKE 'test%@example.com';
   ```
3. If missing, create manually or re-run setup

**Protection**: These accounts are protected from cleanup operations (see `cleanup-test-data-unified` edge function)

---

## Troubleshooting (Original Sections)

### Tests Fail Locally but Pass in CI
- Check Node/browser versions match
- Ensure local dev server is running on port 8080
- Clear Playwright cache: `npx playwright install --force`

### Tests Not Logging to Database
1. Verify GitHub secrets are set correctly
2. Check edge function logs in Admin → Issues → System Logs
3. Ensure `test_runs` table exists
4. Verify RLS policies allow service role to insert

### Slow Test Execution
- Run tests in parallel: `npx playwright test --workers=4`
- Reduce retries in config for local runs
- Use `test.only()` to run specific tests during development

## Visual Regression Testing (Percy)

### Setup
1. Sign up at [percy.io](https://percy.io)
2. Create a new project
3. Get project token from Settings (use copy button for full token!)
4. Add to GitHub Secrets as `PERCY_TOKEN`
5. Ensure `@percy/cli` is in devDependencies

### Test Coverage
**Desktop (1280x720)**: Homepage, Community, Events, Discussions, Store, Sponsor Bestie, Auth, Support, Help Center
**Mobile (375x667)**: Homepage, Community, Events, Store, Auth, Sponsor Bestie
**Tablet (768x1024)**: Homepage, Community, Events, Discussions, Store

**Total**: 24 snapshots across 3 viewport sizes

### How It Works
- Percy runs in separate CI job (doesn't work with test sharding)
- **Logs in automatically** using test account (test@example.com) to capture authenticated pages
- Captures screenshots during test execution using viewport simulation (not paid mobile browsers)
- Compares with approved baseline images
- Comments on PRs with visual diffs
- Only runs if `PERCY_TOKEN` is configured (skipped otherwise)
- Homepage/Auth pages tested without login; Community/Events/Store/Discussions tested with login

### Running Locally
```bash
export PERCY_TOKEN=your_token_here
npx @percy/cli exec -- npx playwright test tests/e2e/visual.spec.ts
```

### Writing Percy Tests
```typescript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

// Desktop test
test('page appearance', async ({ page }) => {
  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');
  await percySnapshot(page, 'My Page Name');
});

// Mobile test using viewport (free alternative to paid mobile browsers)
test.describe('Mobile Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('page - mobile', async ({ page }) => {
    await page.goto('/my-page');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'My Page - Mobile');
  });
});
```

## Performance Testing

### Load Time Tests (@slow tag)
Tests measure page load times and verify they're within acceptable ranges:
- Homepage: <5s
- Community, Events: <5s  
- Marketplace: <6s (image-heavy)

### Core Web Vitals (@slow tag)
Automated testing of Google's Core Web Vitals:
- **LCP (Largest Contentful Paint)**: <4s target
- **CLS (Cumulative Layout Shift)**: <0.25 target
- **FID (First Input Delay)**: Interactive readiness check

### Resource Loading
- Image lazy loading verification
- Console error detection
- Render-blocking resource identification

### Running Performance Tests
```bash
# Run only performance tests
npx playwright test --grep @slow

# Run everything except performance tests
npx playwright test --grep-invert @slow
```

## Future Enhancements

### Potential Additions
- Integration tests for edge functions
- Lighthouse CI integration with budgets
- Accessibility testing (axe-core)
- Slack/Discord notifications on failures
- Test metrics dashboard (pass rate trends, flakiness detection)

### Premium Tools
- **QA Wolf**: Auto-generates tests from user interactions
- **Mabl**: AI-powered test creation and maintenance
- **Testim**: Intelligent test automation platform
