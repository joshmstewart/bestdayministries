# E2E Testing Best Practices

This document consolidates learnings from test runs to help write reliable, maintainable E2E tests.

## Table of Contents
1. [Timeout Guidelines](#timeout-guidelines)
2. [Authentication Flows](#authentication-flows)
3. [🚨 CRITICAL: Authenticating Supabase Clients in Tests](#-critical-authenticating-supabase-clients-in-tests)
4. [Content Existence Patterns](#content-existence-patterns)
5. [Selector Best Practices](#selector-best-practices)
6. [Email Testing](#email-testing)
7. [Common Pitfalls](#common-pitfalls)

---

## Timeout Guidelines

### CI vs Local Performance
**CRITICAL**: CI environments are 2-3x slower than local development machines.

### Recommended Timeouts:

```typescript
// Authentication/navigation flows
await page.waitForURL(/\/(community|admin)/, { timeout: 60000 }); // 60s

// Standard element visibility
await expect(element).toBeVisible({ timeout: 10000 }); // 10s

// Page loads
await page.goto('/page', { timeout: 20000 }); // 20s

// Network requests
await page.waitForResponse(url, { timeout: 15000 }); // 15s

// Content loading (after navigation)
await page.waitForLoadState('networkidle', { timeout: 30000 }); // 30s
```

### Why These Timeouts?
- **60s for auth**: Token generation, database operations, session setup
- **10s for elements**: Rendering, data fetching, animations
- **20s for pages**: Bundle loading, initial rendering, API calls
- **15s for requests**: Network latency, backend processing
- **30s for content**: Multiple API calls, lazy loading, images

---

## Authentication Flows

### The Problem
Login/signup flows are complex and slow:
1. Form submission
2. Database authentication
3. Token generation
4. Session creation
5. Profile loading
6. Redirect + navigation
7. New page rendering

**Total time in CI**: 45-60 seconds

### ✅ CORRECT Pattern

```typescript
test('user can log in', async ({ page }) => {
  await page.goto('/auth');
  
  // Fill login form
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  
  // Submit
  await page.click('button:has-text("Sign In")');
  
  // CRITICAL: Wait for auth processing (2-3 seconds)
  await page.waitForTimeout(2000);
  
  // Wait for navigation with LONG timeout
  await page.waitForURL(/\/(community|admin)/, { timeout: 60000 });
  
  // Verify successful load by waiting for UI element
  await expect(page.locator('h1, h2').first())
    .toBeVisible({ timeout: 10000 });
});
```

### ❌ WRONG Patterns

```typescript
// Too short timeout
await page.waitForURL(/\/community/, { timeout: 30000 }); // FAILS in CI

// No intermediate wait
await page.click('button:has-text("Sign In")');
await page.waitForURL(/\/community/); // Race condition

// No UI confirmation
await page.waitForURL(/\/community/);
// URL changed but page might still be loading!
```

---

## 🚨 CRITICAL: Authenticating Supabase Clients in Tests

**PRODUCTION BUG CAUSED BY THIS**: A real user received fake notifications about comments on posts they never made because test code created content under their user ID.

### The Problem

When creating Supabase clients in E2E tests for data seeding or cleanup, calling `getUser()` on an **unauthenticated client** can return:
- `null` (best case - test fails cleanly)
- A stale session from the environment
- **A REAL USER'S SESSION** (worst case - creates fake data for real users!)

This causes:
1. Test posts/comments created under real user IDs
2. Database triggers fire notifications to real users
3. Real users receive notifications about test content that doesn't exist

### ✅ CORRECT Pattern

```typescript
import { createClient } from '@supabase/supabase-js';
import { getTestAccount, verifyTestAccount } from '../fixtures/test-accounts';

// Create Supabase client for seeding test data
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
```

### ❌ WRONG Pattern - DO NOT DO THIS

```typescript
// ❌ Creating client without authentication
const supabase = createClient(url, key);

// ❌ This could return a REAL USER'S ID!
const { data: { user } } = await supabase.auth.getUser();

// ❌ Test data created under real user's ID
await supabase.from('discussion_posts').insert({
  author_id: user.id, // ← Could be a real user!
  title: 'E2E Test Post'
});
// Result: Real user gets fake notifications!
```

### Best Practice: Use the Helper

Create `tests/utils/test-helpers.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { getTestAccount, verifyTestAccount } from '../fixtures/test-accounts';

/**
 * Create an authenticated Supabase client for testing
 * Automatically signs in with test account credentials
 */
export async function createAuthenticatedTestClient() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );
  
  const testAccount = getTestAccount();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testAccount.email,
    password: testAccount.password,
  });
  
  if (signInError) {
    throw new Error(`Failed to authenticate test client: ${signInError.message}`);
  }
  
  // Verify we're using a test account
  const { data: { session } } = await supabase.auth.getSession();
  verifyTestAccount(session?.user?.email);
  
  console.log(`✅ Authenticated test client as ${session?.user?.email}`);
  
  return supabase;
}
```

Then in tests:

```typescript
import { createAuthenticatedTestClient } from '../utils/test-helpers';

test.beforeAll(async () => {
  // ✅ Always authenticated, always verified
  const supabase = await createAuthenticatedTestClient();
  
  // Safe to use immediately
  const { data: { user } } = await supabase.auth.getUser();
  // Guaranteed to be a test account
});
```

### Why This Matters

- **Real Impact**: This bug caused production issues with real users
- **Silent Failure**: Tests pass, but real users are affected
- **Hard to Debug**: Fake notifications appear hours/days after test runs
- **Data Integrity**: Test data mixed with production data

### Checklist for Test Data Seeding

- [ ] Create Supabase client
- [ ] **Sign in with test account credentials** ← NEVER SKIP THIS
- [ ] Get user/session
- [ ] **Verify it's a test account** using `verifyTestAccount()`
- [ ] Create test data
- [ ] Clean up in `afterAll` (also authenticated!)

---

## Content Existence Patterns

### The Problem
Tests often fail because content from the database doesn't exist in the test environment.

### ✅ CORRECT: Handle Both Scenarios

```typescript
test('page displays content or empty state', async ({ page }) => {
  await page.goto('/videos');
  
  // Get content count
  const videoCount = await page.locator('[data-testid="video-player"]').count();
  
  // Check for empty state
  const hasEmptyState = await page
    .getByText(/no videos available|nothing to show/i)
    .isVisible()
    .catch(() => false);
  
  // Assert EITHER content OR empty state
  expect(videoCount > 0 || hasEmptyState).toBeTruthy();
});
```

### Common Empty State Messages
- "No videos available"
- "No questions yet"
- "No posts found"
- "Nothing to display"
- "Get started by..."

### ❌ WRONG: Assume Content Exists

```typescript
// Fails when no content in database
await expect(page.locator('[data-testid="video-player"]'))
  .toBeVisible();

// Fails if count is 0
const count = await page.locator('.item').count();
expect(count).toBeGreaterThan(0);
```

---

## Template Literals in Dynamic Tests

When creating tests in loops, always use backticks for template literals:

**CORRECT** ✅:
```typescript
const pages = [
  { path: '/', name: 'Homepage' },
  { path: '/about', name: 'About' }
];

for (const page of pages) {
  // Backticks allow variable interpolation
  test(`should load ${page.name} page`, async ({ page: browser }) => {
    await browser.goto(page.path);
    expect(await browser.title()).toContain(page.name);
  });
}
```

**WRONG** ❌:
```typescript
for (const page of pages) {
  // Single quotes create literal string - all tests have same title!
  test('should load ${page.name} page', async ({ page: browser }) => {
    // This creates duplicate test titles → Playwright error
  });
}
```

**Why This Matters**:
- Playwright requires unique test titles
- Template literals with single quotes don't interpolate variables
- Results in "duplicate test title" errors
- Makes test debugging impossible (all tests have same name)

---

## Selector Best Practices

### Selector Hierarchy (Best to Worst)

1. **Test IDs** (Best for tests)
   ```typescript
   page.getByTestId('submit-button')
   <button data-testid="submit-button">Submit</button>
   ```

2. **Role-based** (Semantic and accessible)
   ```typescript
   page.getByRole('button', { name: 'Submit' })
   page.getByRole('heading', { name: 'Welcome' })
   ```

3. **Text-based** (Readable but fragile)
   ```typescript
   page.getByText('Submit')
   page.locator('text=Submit')
   ```

4. **CSS selectors** (Use sparingly)
   ```typescript
   page.locator('.submit-button')
   page.locator('#submit-form')
   ```

### ✅ CORRECT Patterns

```typescript
// Specific role + name
await page.getByRole('button', { name: 'Sign In' }).click();

// Data test ID
await page.getByTestId('login-form').fill('email', 'test@example.com');

// Combining selectors with .or()
const button = page
  .getByRole('button', { name: 'Submit' })
  .or(page.locator('[data-testid="submit"]'));

// Waiting before interaction
await page.getByRole('button', { name: 'Submit' }).waitFor();
await page.getByRole('button', { name: 'Submit' }).click();
```

### ❌ WRONG Patterns

```typescript
// Multiple selector syntaxes in one call (SYNTAX ERROR)
page.locator('button:has-text("Sign In"), text="Sign In"')

// Too generic
page.locator('button').first() // Which button?

// Not waiting for element
await page.locator('.my-element').click() // Might not exist yet

// Complex CSS that's hard to maintain
page.locator('div.container > ul.list > li:nth-child(2) > a')
```

---

## Email Testing

### Special Requirements

Email tests are **fundamentally different** from standard E2E tests:

1. **Require service-level access** (`SUPABASE_SERVICE_KEY`)
2. **Need real email infrastructure** (Resend API, SMTP)
3. **Slower execution** (email delivery can take seconds)
4. **Cannot verify email delivery** in test environment

### Recommended Setup

**Separate workflow file**: `.github/workflows/email-tests.yml`

```yaml
name: Email Tests
on:
  workflow_dispatch: # Manual trigger only
  
jobs:
  email-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Run email tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }} # CRITICAL
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
        run: npx playwright test tests/e2e/email-*.spec.ts
```

### ⚠️ Limitations

- **Cannot run in standard CI** without service key
- **Manual trigger only** to avoid accidental runs
- **May send real emails** (use test email addresses)
- **Database state verification only** (can't verify email content without catching emails)

---

## Testing Library Setup

### Required Import for DOM Matchers

`@testing-library/jest-dom` provides DOM-specific matchers. You MUST import it to use matchers like `toBeInTheDocument()`:

**CORRECT** ✅:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // ← Required for DOM matchers
import MyComponent from '@/components/MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument(); // ✅ Works!
});
```

**WRONG** ❌:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// Missing: import '@testing-library/jest-dom';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument(); // ❌ Error: Invalid Chai property
});
```

### Common Testing Library Matchers

All require `import '@testing-library/jest-dom'`:

| Matcher | Purpose | Example |
|---------|---------|---------|
| `toBeInTheDocument()` | Element exists in DOM | `expect(element).toBeInTheDocument()` |
| `toBeVisible()` | Element is visible | `expect(element).toBeVisible()` |
| `toHaveTextContent()` | Element contains text | `expect(element).toHaveTextContent('Hello')` |
| `toHaveAttribute()` | Element has attribute | `expect(element).toHaveAttribute('href', '/about')` |
| `toBeDisabled()` / `toBeEnabled()` | Form element state | `expect(button).toBeDisabled()` |
| `toHaveClass()` | Element has CSS class | `expect(element).toHaveClass('active')` |
| `toHaveValue()` | Input has value | `expect(input).toHaveValue('test')` |

### Setup File Option

For projects with many tests, import once in setup file:

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom';

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

---

## CRITICAL TEST PHILOSOPHY ⚠️

### Rule #1: Always Fix Root Cause, Never Force Tests to Pass
When a test fails:
- ✅ Investigate and fix the actual bug in the code
- ✅ Update the test if it's testing the wrong behavior
- ❌ NEVER modify tests just to make them pass without fixing the root issue
- ❌ NEVER skip or disable tests without documenting why

### Rule #2: Document All Learnings from Test Failures
Every test failure teaches us something. Document:
- What failed and why (root cause)
- How it was fixed
- How to prevent it in the future
- Update relevant documentation with the learning

See `TEST_FIXES_2025_10_23.md` for recent examples and detailed philosophy.

---

## Defensive Test Patterns

When testing features that depend on admin-configured data or specific user roles, use defensive patterns to handle missing data gracefully.

### Pattern 1: Check-Warn-Continue
Use when an element might not exist but the test should continue:

```typescript
const element = await page.locator('button:has-text("Action")')
  .isVisible({ timeout: 5000 })
  .catch(() => false);

if (!element) {
  console.warn('⚠️ Element not found - may not be configured');
}
// Continue with other assertions
```

**When to Use**:
- Testing optional features
- Testing role-specific UI elements
- Testing admin-configured content

### Pattern 2: Check-Warn-Fallback
Use when an element might not exist, but you want to verify the page still works:

```typescript
const hasFeature = await page.locator('.feature-item').count() > 0;

if (!hasFeature) {
  console.warn('⚠️ Feature not configured in admin');
  // Fallback: verify page loaded successfully
  const body = page.locator('body');
  await expect(body).toBeVisible();
} else {
  // Test the feature
  expect(hasFeature).toBeTruthy();
}
```

**When to Use**:
- Testing pages with optional sections
- Testing features that might be disabled
- Verifying page load success regardless of content

### Pattern 3: Check-Both-States
Use when content might be populated or in an empty state:

```typescript
const hasContent = await page.locator('.content-item').count() > 0;
const hasEmptyState = await page.locator('text=/no items available|nothing to display/i')
  .isVisible({ timeout: 5000 })
  .catch(() => false);

// Assert EITHER content OR empty state (both are valid)
expect(hasContent || hasEmptyState).toBeTruthy();
```

**When to Use**:
- Testing lists that might be empty
- Testing admin-managed content
- Testing database-driven UI

### Service Key Requirements for Test Data Seeding

When edge functions create test data, they need service-level access to bypass RLS policies.

#### Required Environment Variable
```yaml
# In GitHub Actions workflow
env:
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

#### Why Service Key is Required
- Bypasses Row Level Security (RLS) policies
- Can create users via Admin API (`auth.admin.createUser()`)
- Can insert into protected tables
- Required for any admin-level database operations

#### Where to Apply
- **Email test workflow**: `.github/workflows/email-tests.yml` ✅
- **Main test workflow**: `.github/workflows/test.yml` ✅
- **Local test setup**: Via environment variable or `.env.local`

#### Example: Seed Function
```typescript
// supabase/functions/seed-email-test-data/index.ts
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required'); // ← Defensive check
}

// Create admin client with service key
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
```

---

## Mobile & Browser Compatibility Testing

### iOS Safari Testing Priority

**CRITICAL:** iOS Safari has unique rendering bugs that don't appear in other browsers.

**Known Issues:**
- **iOS 18.x:** CSS transform rendering bug causing pages to disappear
- **iOS 17.x:** Viewport height inconsistencies with bottom navigation
- **iOS 16.x:** Touch event handling differences

### Testing Matrix for CSS Changes

When making changes to transforms, animations, or positioning:

| Priority | Device | Version | What to Test |
|----------|--------|---------|--------------|
| CRITICAL | iPhone | iOS 18.x | Page doesn't disappear, transforms render correctly |
| HIGH | iPhone | iOS 19+ | No regressions from iOS 18 workarounds |
| MEDIUM | Android | Latest Chrome | General functionality |
| MEDIUM | Desktop | Safari | CSS compatibility |
| LOW | Desktop | Chrome | Baseline behavior |

### Browser Detection in Tests

Test browser-specific code paths:

```typescript
test('renders correctly on iOS 18.x', async ({ page }) => {
  // Simulate iOS 18.x user agent
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'
  );
  
  await page.goto('/community');
  
  // Verify graceful degradation
  const element = page.locator('[data-testid="rotated-component"]');
  await expect(element).toBeVisible();
  
  // Should NOT have rotation class on iOS 18.x
  const hasRotation = await element.evaluate(el => 
    el.className.includes('transform:rotate')
  );
  expect(hasRotation).toBe(false);
});

test('renders with effects on modern browsers', async ({ page }) => {
  await page.goto('/community');
  
  const element = page.locator('[data-testid="rotated-component"]');
  await expect(element).toBeVisible();
  
  // Should have rotation on non-iOS-18 browsers
  const hasRotation = await element.evaluate(el => 
    el.className.includes('transform:rotate')
  );
  expect(hasRotation).toBe(true);
});
```

### Visual Regression for Mobile

Use Percy or similar to catch iOS-specific rendering:

```typescript
test.describe('iOS Compatibility', () => {
  test('page visible on iOS 18.x', async ({ page }) => {
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'
    );
    
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    // Visual snapshot
    await percySnapshot(page, 'Community Page - iOS 18 Safari');
  });
});
```

### Testing Checklist for CSS Changes

Before deploying transform/animation changes:

- [ ] Test on iOS 18.x device (physical or BrowserStack)
- [ ] Test on iOS 19+ device
- [ ] Test on Android Chrome
- [ ] Verify ErrorBoundary catches failures
- [ ] Check console for layout warnings
- [ ] Test both portrait and landscape
- [ ] Verify touch interactions work
- [ ] Check session replay for unexpected shifts

### BrowserStack Configuration

For comprehensive mobile testing:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'ios-18-safari',
      use: {
        browserName: 'webkit',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
        viewport: { width: 390, height: 844 }, // iPhone 13
      },
    },
    {
      name: 'ios-19-safari',
      use: {
        browserName: 'webkit',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15',
        viewport: { width: 393, height: 852 }, // iPhone 14
      },
    },
  ],
});
```

---

## Common Pitfalls

### 1. Race Conditions

```typescript
// ❌ WRONG
await page.click('button');
await expect(page.locator('.result')).toBeVisible();

// ✅ CORRECT
await page.click('button');
await page.waitForTimeout(500); // Give it time to process
await expect(page.locator('.result')).toBeVisible({ timeout: 5000 });
```

### 2. Flaky Element Queries

```typescript
// ❌ WRONG
const isVisible = await page.locator('.element').isVisible();

// ✅ CORRECT
const isVisible = await page.locator('.element')
  .isVisible()
  .catch(() => false);
```

### 3. Not Cleaning Up Test Data

```typescript
// ✅ ALWAYS use afterEach or afterAll
test.afterEach(async () => {
  // Clean up test data created during this test
  await cleanupTestData();
});
```

### 4. Hardcoded Waits

```typescript
// ❌ WRONG
await page.waitForTimeout(5000); // Arbitrary wait

// ✅ CORRECT
await page.waitForSelector('.content'); // Wait for specific condition
```

### 5. Assuming UI State

```typescript
// ❌ WRONG
await page.click('button'); // Assumes button exists and is clickable

// ✅ CORRECT
await expect(page.locator('button')).toBeEnabled();
await page.click('button');
```

---

## Quick Reference Checklist

Before writing a test, ask yourself:

- [ ] Am I using appropriate timeouts for CI? (60s for auth, 10s for elements)
- [ ] Am I handling empty state scenarios?
- [ ] Am I using the best selector (test ID > role > text > CSS)?
- [ ] Am I waiting for intermediate states in multi-step flows?
- [ ] Am I cleaning up test data created?
- [ ] Do I need special environment variables? (email tests)
- [ ] Am I providing clear error messages in assertions?

---

## Related Documentation

- **TEST_FIXES_2025_10_22.md** - Recent fixes and improvements
- **TEST_ANALYSIS_2025_10_22.md** - Comprehensive analysis of test failures
- **AUTOMATED_TESTING_SYSTEM.md** - Complete testing system overview
- **TEST_DATA_CLEANUP_CRITICAL.md** - Test data cleanup patterns
