# Testing Strategy

## Overview

This document outlines our testing approach, which follows the **Test Pyramid** strategy to maximize reliability while minimizing maintenance overhead.

## The Test Pyramid

```
       /\
      /E2E\      ← 15% - Critical user journeys only
     /------\
    /  INT  \    ← 35% - Component + API integration
   /----------\
  /    UNIT   \  ← 50% - Pure logic, utilities, helpers
 /--------------\
```

### Why This Approach?

- **Speed**: Unit tests run in milliseconds, integration in seconds, E2E in minutes
- **Reliability**: Lower-level tests have fewer dependencies and less flakiness
- **Debugging**: Failed unit test pinpoints exact function; failed E2E could be anywhere
- **Cost**: E2E tests are 100x more expensive to write and maintain

---

## Test Types

### 1. Unit Tests (50% of tests)

**What to Test:**
- Pure functions and utilities
- Business logic
- Data transformations
- Validation rules
- Calculations

**Example:**
```typescript
// tests/unit/calculateRarity.test.ts
import { calculateRarity } from '@/lib/stickerUtils';

describe('calculateRarity', () => {
  it('returns correct percentage for common rarity', () => {
    expect(calculateRarity('common')).toBe(50);
  });

  it('returns correct percentage for legendary rarity', () => {
    expect(calculateRarity('legendary')).toBe(1);
  });
});
```

**When to Use:**
- Testing helper functions
- Validating form logic
- Testing state management utilities
- Any pure function without side effects

**Run Command:** `npm run test:unit`

---

### 2. Integration Tests (35% of tests)

**What to Test:**
- React components with mocked APIs
- Component interactions
- State management with React Query
- Form submissions
- UI behavior

**Example:**
```typescript
// tests/integration/contact-form.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactForm } from '@/components/ContactForm';

describe('ContactForm', () => {
  it('validates required fields', async () => {
    render(<ContactForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });
});
```

**When to Use:**
- Testing component rendering logic
- Testing form validation
- Testing API interactions (mocked)
- Testing user interactions without full E2E

**Setup:** Uses MSW (Mock Service Worker) to mock API responses
**Run Command:** `npm run test:integration`

---

### 3. E2E Tests (15% of tests)

**What to Test:**
- Critical user journeys only
- Payment flows
- Authentication flows
- Multi-step workflows that cross boundaries

**Example Critical Paths:**
```typescript
// tests/e2e/critical-paths.spec.ts
test('user can signup, sponsor a bestie, and complete payment', async ({ page }) => {
  // 1. Signup
  await page.goto('/auth');
  await page.fill('[name="email"]', 'newuser@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button:has-text("Sign Up")');
  
  // 2. Navigate to sponsor page
  await page.goto('/sponsor-bestie');
  await page.click('button:has-text("Sponsor")');
  
  // 3. Complete payment (Stripe)
  await page.waitForURL('**/checkout.stripe.com/**');
  // ... payment steps
  
  // 4. Verify success
  await expect(page).toHaveURL(/sponsorship-success/);
});
```

**When to Use:**
- Testing payment processing
- Testing external integrations (Stripe, email)
- Testing critical business flows
- Testing authentication edge cases

**What NOT to Test:**
- ❌ Every UI element's existence
- ❌ Every permutation of forms
- ❌ Static content rendering
- ❌ CSS and styling (use Percy instead)

**Run Command:** `npm run test:e2e`

---

## Decision Matrix

| Scenario | Test Type | Reason |
|----------|-----------|--------|
| Validate email format | Unit | Pure function, no dependencies |
| Test form submission UI | Integration | Component behavior with mocked API |
| Test Stripe payment flow | E2E | External integration, money involved |
| Calculate sticker rarity | Unit | Pure math, no side effects |
| Test approval badge count | Integration | Component + mocked notifications API |
| Test signup → sponsor → success | E2E | Critical revenue path, multi-system |
| Test emoji code generation | Unit | Pure function, deterministic |
| Test discussion post rendering | Integration | Component with mocked data |

---

## Test Data Management

### Test Builders Pattern

We use the **Builder Pattern** for creating test data. This provides:
- ✅ Fluent, readable test setup
- ✅ Reusable across tests
- ✅ Default values with customization
- ✅ Reduced boilerplate

**Example:**
```typescript
import { GuardianBuilder } from '@/tests/builders';

// Before (brittle, 50+ lines)
const guardian = await createTestUser('guardian');
await insertBestieLink(guardian.id, bestie.id);
await setApprovalFlags(guardian.id, bestie.id);

// After (fluent, 3 lines)
const { guardian, bestie } = await new GuardianBuilder()
  .withLinkedBestie()
  .withApprovalFlags({ posts: true })
  .build();
```

### Available Builders

- **GuardianBuilder**: Creates guardian + linked besties
- **SponsorshipBuilder**: Creates sponsor relationships
- **DiscussionBuilder**: Creates posts + comments
- **StickerBuilder**: Creates collections + stickers
- **VendorBuilder**: Creates vendors + products

See [TESTING_BUILDERS.md](./TESTING_BUILDERS.md) for detailed usage.

---

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run unit tests only (fast)
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npx playwright test --ui

# Visual regression tests (Percy)
npm run test:visual
```

### CI/CD

Tests run automatically on every push via GitHub Actions:
- Unit tests: Always run
- Integration tests: Always run
- E2E tests: Run on main branch and PRs
- Visual tests: Run on Percy-enabled PRs

---

## Maintenance Guidelines

### When to Add a Test

✅ **DO add tests for:**
- New features
- Bug fixes (regression tests)
- Critical user paths
- Complex business logic

❌ **DON'T add tests for:**
- Trivial getters/setters
- Third-party library behavior
- Static UI elements
- Framework behavior (React, Supabase)

### When to Refactor Tests

🔄 **Refactor tests when:**
- Same setup code appears 3+ times → Create builder
- Test takes >5 seconds → Consider moving to integration
- Test is flaky → Add explicit waits or move to unit/integration
- Test has no value → Delete it

### Test Smell Checklist

❌ **Bad Test Smells:**
- `test.skip()` without a ticket
- `waitForTimeout()` instead of `waitFor()`
- Tests that depend on execution order
- Tests that require manual database setup
- Tests that test framework behavior

✅ **Good Test Practices:**
- Descriptive test names
- Single assertion per test (when possible)
- Arrange-Act-Assert pattern
- Independent tests (no shared state)
- Fast execution (<100ms for unit, <2s for integration)

---

## Migration Path

### Converting E2E → Integration

**Steps:**
1. Identify E2E test that doesn't need browser
2. Extract business logic being tested
3. Create integration test with MSW mocks
4. Verify new test covers same scenarios
5. Delete E2E test

**Example:**
```typescript
// BEFORE: E2E test (slow, flaky)
test('shows sticker collection', async ({ page }) => {
  await page.goto('/sticker-album');
  await expect(page.locator('.sticker')).toHaveCount(5);
});

// AFTER: Integration test (fast, reliable)
test('renders stickers from API', async () => {
  render(<StickerAlbum />);
  expect(await screen.findAllByRole('img')).toHaveLength(5);
});
```

---

## Resources

- [Test Builders Documentation](./TESTING_BUILDERS.md)
- [Integration Testing Guide](./TESTING_INTEGRATION.md)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)
- [MSW Documentation](https://mswjs.io/docs/)

---

## Questions?

**Q: Why not 100% E2E coverage?**  
A: E2E tests are slow, flaky, and expensive. They should only cover critical paths.

**Q: When should I mock vs. use real data?**  
A: Integration tests mock APIs. E2E tests use real services (Stripe test mode, real DB).

**Q: How do I handle authentication in tests?**  
A: Unit/Integration: Mock auth state. E2E: Use persistent test accounts.

**Q: What if my E2E test is flaky?**  
A: Either add explicit waits, or consider if it should be an integration test instead.
