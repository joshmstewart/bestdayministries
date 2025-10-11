# Test Suite

This directory contains all automated tests for the application.

## Test Types

### E2E Tests (Playwright)
End-to-end tests that simulate real user interactions:
- `basic.spec.ts` - Homepage and basic functionality
- `navigation.spec.ts` - Page navigation and routing
- `auth.spec.ts` - Authentication flows
- `forms.spec.ts` - Form validation and submission
- `community.spec.ts` - Community features
- `store.spec.ts` - Store and coins functionality
- `admin.spec.ts` - Admin dashboard features

### Unit Tests (Vitest)
Component and utility function tests:
- `unit/components/` - React component tests
- `unit/lib/` - Utility function tests

### Visual Regression Tests (Percy)
Screenshot comparison tests:
- `visual.spec.ts` - UI appearance across pages

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run unit tests
npm run test:unit

# Run E2E tests
npx playwright test

# Run visual tests (requires Percy token)
npm run test:visual

# Run all tests
npm run test:all
```

## Documentation

- **Option 1 (Basic)**: See `docs/AUTOMATED_TESTING_SYSTEM.md`
- **Option 2 (Full Suite)**: See `docs/TESTING_OPTION_2.md`

## CI/CD

Tests run automatically on every push/PR via GitHub Actions.
View results in:
- GitHub Actions tab
- Admin Dashboard → Testing
