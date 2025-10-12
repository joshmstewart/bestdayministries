# Test Suite

This directory contains all automated tests for the application.

## Test Types

### E2E Tests (Playwright)
End-to-end tests that simulate real user interactions:
- `basic.spec.ts` - Homepage and basic functionality
- `navigation.spec.ts` - Page navigation and routing
- `auth.spec.ts` - Authentication flows (signup, login, password reset)
- `forms.spec.ts` - Form validation and submission (includes anonymous & authenticated user tests)
- `community.spec.ts` - Community features
- `store.spec.ts` - Store and coins functionality
- `admin.spec.ts` - Admin dashboard features
- `guardian-linking.spec.ts` - **Guardian-Bestie linking with FAST + SLOW tests**
- `guardian-approvals.spec.ts` - Guardian approval workflows
- `sponsorship.spec.ts` - Sponsorship flows
- `vendor-linking.spec.ts` - Vendor-Bestie linking

### Unit Tests (Vitest)
Component and utility function tests:
- `unit/components/` - React component tests
- `unit/lib/` - Utility function tests

### Visual Regression Tests (Percy)
Screenshot comparison tests:
- `visual.spec.ts` - UI appearance across pages

## Test Speed Categories

Tests are annotated with speed categories:

### @fast - Smoke Tests (< 5 seconds)
- Verify UI elements exist
- Check page loads
- Validate basic rendering
- **Run by default in CI**

### @slow - Integration Tests (10-30 seconds)
- Full user interaction flows
- Complex form submissions
- Multi-step workflows with Radix UI components
- **Marked with `test.slow()` for 3x timeout**

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run ALL tests (fast + slow)
npx playwright test

# Run ONLY fast tests (recommended for development)
npx playwright test --grep @fast

# Run ONLY slow tests (comprehensive validation)
npx playwright test --grep @slow

# Run specific test file
npx playwright test guardian-linking

# Run unit tests
npm run test:unit

# Run visual tests (requires Percy token)
npm run test:visual

# Run all tests
npm run test:all
```

## Development Workflow

**During Development:**
```bash
# Quick validation (< 1 minute)
npx playwright test --grep @fast

# Full validation before PR (5-10 minutes)
npx playwright test
```

**In CI/CD:**
- Fast tests run on every commit (quick feedback)
- Slow tests run on PR merge to main (full coverage)

## Guardian-Bestie Linking Tests

Example of our dual test strategy:

```typescript
// ✅ FAST - Just verify UI exists
test.describe('UI Smoke Tests @fast', () => {
  test('should show emoji selectors', async ({ page }) => {
    expect(await page.getByText('First Emoji').isVisible()).toBeTruthy();
  });
});

// 🐌 SLOW - Full interaction flow
test.describe('Full Interaction Tests @slow', () => {
  test('should successfully link using friend code', async ({ page }) => {
    test.slow(); // 3x timeout
    // Select all 3 emojis via Radix UI dropdowns
    // Fill relationship field
    // Submit and verify link created
  });
});
```

## Best Practices

1. **Use data-testid for complex components** (especially Radix UI)
2. **Add waits after React state updates** (200-300ms)
3. **Mark slow tests with `test.slow()`** for 3x timeout
4. **Keep fast tests simple** - just verify UI presence
5. **Use comprehensive tests for critical flows** - full user interactions

## Documentation

- **Option 1 (Basic)**: See `docs/AUTOMATED_TESTING_SYSTEM.md`
- **Option 2 (Full Suite)**: See `docs/TESTING_OPTION_2.md`

## CI/CD

Tests run automatically on every push/PR via GitHub Actions.
View results in:
- GitHub Actions tab
- Admin Dashboard → Testing
