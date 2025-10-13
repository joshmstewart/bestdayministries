# Testing Option 2: Full Test Suite

This document covers the complete testing setup including E2E tests (Playwright), visual regression testing (Percy), and unit tests (Vitest).

## Overview

### What's Included
- ✅ **E2E Testing** - Playwright tests across Chrome, Firefox, Safari
- ✅ **Visual Regression** - Percy snapshots to catch UI changes
- ✅ **Unit Testing** - Vitest for component and utility testing
- ✅ **Coverage Reports** - Code coverage tracking
- ✅ **CI/CD Integration** - Automated testing on every push/PR

### Package.json Scripts
Add these scripts to your `package.json`:
```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:visual": "percy exec -- playwright test tests/visual.spec.ts",
    "test:all": "npm run test:unit && npm run test:e2e"
  }
}
```

## Test Structure

```
tests/
├── setup.ts                    # Vitest test setup
├── unit/                       # Unit tests
│   ├── components/            # Component tests
│   │   ├── TextToSpeech.test.tsx
│   │   └── CoinsDisplay.test.tsx
│   └── lib/                   # Utility function tests
│       ├── avatarUtils.test.ts
│       └── validation.test.ts
├── visual.spec.ts             # Percy visual regression tests
├── basic.spec.ts              # Basic E2E tests
├── navigation.spec.ts         # Navigation tests
├── auth.spec.ts               # Authentication tests
├── forms.spec.ts              # Form tests
├── community.spec.ts          # Community features
├── store.spec.ts              # Store/coins tests
└── admin.spec.ts              # Admin features
```

## Running Tests Locally

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run in watch mode
npm run test:unit:watch

# Run with coverage
npm run test:unit:coverage

# Run specific test file
npm run test:unit -- tests/unit/lib/validation.test.ts
```

### E2E Tests
```bash
# Run all Playwright tests (excludes visual tests)
npx playwright test tests/e2e/

# Run specific test file
npx playwright test tests/e2e/basic.spec.ts

# Run in UI mode
npx playwright test --ui

# View test report
npx playwright show-report
```

### Visual Regression Tests
```bash
# Set Percy token (get from percy.io project settings)
export PERCY_TOKEN=your_token_here

# Run visual tests with Percy
npx percy exec -- npx playwright test tests/e2e/visual.spec.ts

# Note: Percy must be running for snapshots to be captured
# If Percy token is not set, tests will pass but skip snapshots
```

## Percy Setup

Percy provides visual regression testing by capturing screenshots and comparing them across builds.

### Initial Setup
1. Sign up at [percy.io](https://percy.io)
2. Create a new project
3. Get your project token from Settings
4. Add the token to GitHub Secrets as `PERCY_TOKEN`

### How It Works
- Percy captures screenshots during test runs
- Compares new screenshots with baseline
- Flags visual differences for review
- Integrates with GitHub PRs showing visual changes

### Reviewing Changes
1. Percy comments on your PR with results
2. Click the link to review visual diffs
3. Approve or reject changes
4. Approved changes become the new baseline

## Writing Tests

### Unit Tests

**Component Test Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

**Utility Test Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/myUtils';

describe('myFunction', () => {
  it('returns expected value', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Visual Tests

```typescript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('page appearance', async ({ page }) => {
  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');
  await percySnapshot(page, 'My Page');
});
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) has three separate jobs:

1. **Unit Tests**: Runs Vitest tests with coverage
2. **E2E Tests**: Runs Playwright tests (sharded across 4 parallel jobs, excludes visual tests)
3. **Visual Tests**: Runs Percy visual regression tests separately (only if `PERCY_TOKEN` is configured)
4. **Log Results**: Logs all test results to database

### Why Visual Tests Are Separate

Percy doesn't work with test sharding, so visual tests run in a dedicated job using:
```bash
npx percy exec -- npx playwright test tests/e2e/visual.spec.ts
```

The visual tests job only runs if:
- `run_visual_tests` input is true (default)
- `PERCY_TOKEN` secret is configured

### Workflow Inputs

When manually triggering the workflow, you can choose which test suites to run:
- `run_unit_tests` (default: true)
- `run_e2e_tests` (default: true)  
- `run_visual_tests` (default: true)

## Coverage Reports

Coverage reports show which code is tested:
- View locally: `npm run test:unit:coverage` then open `coverage/index.html`
- View in CI: Download coverage artifacts from GitHub Actions

## Best Practices

### Unit Tests
- Test individual functions and components in isolation
- Mock external dependencies (API calls, hooks, etc.)
- Focus on logic, edge cases, and error handling
- Keep tests fast and independent

### Visual Tests
- Test key pages and components
- Include both desktop and mobile viewports
- Wait for page to be fully loaded before snapshot
- Name snapshots clearly and consistently

### E2E Tests
- Test complete user workflows
- Use realistic user scenarios
- Test critical paths first
- Keep tests stable and reliable

#### E2E Reliability Patterns (Critical)
**Flaky tests are often caused by timing issues. Follow these patterns:**

1. **Layered Waiting Strategy**
   ```typescript
   // Navigate to tab
   await page.getByRole('tab', { name: /settings/i }).click();
   
   // Wait for section to load
   await page.waitForSelector('text=/Section Heading/i', { 
     timeout: 15000, 
     state: 'visible' 
   });
   
   // Wait for component to render
   await page.waitForSelector('text=/Component Title/i', { 
     timeout: 10000, 
     state: 'visible' 
   });
   
   // Wait for interactive element
   const button = page.locator('button').filter({ hasText: /Exact Text/i });
   await button.waitFor({ state: 'visible', timeout: 5000 });
   ```

2. **Verify Component Text Before Writing Tests**
   - Open the actual component file
   - Find exact button text, headings, labels
   - Use exact patterns instead of generic ones
   
3. **Avoid Common Pitfalls**
   - ❌ Don't use `waitForTimeout()` - creates flaky tests
   - ❌ Don't use generic text patterns like `/link|submit/i`
   - ❌ Don't assume tab content is loaded after clicking tab
   - ✅ Use `waitForSelector()` with specific targets
   - ✅ Use exact text from component code
   - ✅ Wait for content within tabs to be visible

## Common Issues

### Unit Tests Failing
- Check that mocks are properly configured in `tests/setup.ts`
- Verify imports use correct paths (`@/` alias)
- Ensure components have proper test IDs or accessible roles

### Percy Not Running
- Verify `PERCY_TOKEN` is set in GitHub Secrets (Settings → Secrets → Actions → New repository secret)
- Check that Percy package is installed (`@percy/playwright` in package.json)
- Ensure token has correct permissions (copy from percy.io project settings)
- Visual tests run in separate job - check "visual-tests" job in GitHub Actions
- If Percy is not configured, visual tests are skipped (not failed)

### Coverage Too Low
- Add tests for untested files
- Focus on critical business logic first
- Exclude config files from coverage requirements

## Monitoring

### Test Results
- View in Admin Dashboard → Testing tab
- Check GitHub Actions for detailed logs
- Download test reports from CI artifacts

### Visual Changes
- Percy comments on PRs with visual diffs
- Review changes before merging
- Track visual debt over time

## Next Steps

To further enhance testing:
- Add integration tests for API endpoints
- Set up performance testing with Lighthouse
- Add accessibility testing
- Configure test notifications
- Implement smoke tests for production

## Cost Considerations

- **Vitest**: Free and open source
- **Percy**: Free tier includes 5,000 snapshots/month
- **GitHub Actions**: Free for public repos, included minutes for private repos

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Percy Documentation](https://docs.percy.io/)
- [Playwright Documentation](https://playwright.dev/)
