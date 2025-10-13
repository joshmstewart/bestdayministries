# Automated Testing System (Option 1 - Basic)

## Overview
The application includes automated end-to-end (E2E) testing using Playwright that runs on every push/PR via GitHub Actions. Test results are automatically logged to the database and viewable in the Admin dashboard.

**NOTE:** For the full testing suite including unit tests and visual regression, see [TESTING_OPTION_2.md](./TESTING_OPTION_2.md).

## Components

### 1. Test Framework (Playwright)
- **Config**: `playwright.config.ts`
- **Tests**: 
  - `tests/e2e/basic.spec.ts` - Basic navigation and page loads
  - `tests/e2e/auth.spec.ts` - **Comprehensive signup/login tests for all roles**
  - `tests/e2e/guardian-linking.spec.ts` - **Friend code linking and role verification**
  - `tests/e2e/vendor-linking.spec.ts` - **Vendor-bestie linking and approval flow**
  - Other E2E tests for forms, community, store, etc.
- **Browsers**: Chrome, Firefox, Safari
- **Features**: Screenshots on failure, retries on CI, HTML reports

### 2. GitHub Actions Workflow
- **File**: `.github/workflows/test.yml`
- **Triggers**: Push to main/master, pull requests
- **Steps**: Install deps → Build → Run tests → Upload reports → Log to DB
- **Artifacts**: Test reports stored for 30 days

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

### First Test Run
1. Commit and push code to trigger workflow
2. Go to GitHub → Actions to see test execution
3. Check Admin → Testing tab to see logged results

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

## Troubleshooting

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

## Future Enhancements

### Potential Additions
- Visual regression testing (Percy, Applitools)
- Unit tests with Vitest
- Integration tests for edge functions
- Performance testing with Lighthouse
- Test coverage reporting
- Slack/Discord notifications on failures
- Test metrics dashboard (pass rate trends, flakiness detection)

### Premium Tools
- **QA Wolf**: Auto-generates tests from user interactions
- **Mabl**: AI-powered test creation and maintenance
- **Testim**: Intelligent test automation platform
