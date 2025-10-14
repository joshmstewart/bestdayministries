import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

// Helper function to log in before tests
async function login(page: any) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  // Fill in login credentials (use test account)
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'testpassword123');
  
  // Click login button
  await page.click('button:has-text("Sign In")');
  
  // Wait for redirect after login
  await page.waitForURL(/\/(?!auth)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Visual Regression Tests - Desktop', () => {
  test('homepage appearance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage');
  });

  test('community page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community Page');
  });

  test('events page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Events Page');
  });

  test('discussions page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Discussions Page');
  });

  test('store page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Store Page');
  });

  test('sponsor bestie page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Sponsor Bestie Page');
  });

  test('auth page appearance', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Auth Page');
  });

  test('support page appearance', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Support Page');
  });

  test('help center appearance', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Help Center');
  });
});

test.describe('Visual Regression Tests - Mobile (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('homepage - mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage - Mobile');
  });

  test('community - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community - Mobile');
  });

  test('events - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Events - Mobile');
  });

  test('store - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Store - Mobile');
  });

  test('auth - mobile', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Auth - Mobile');
  });

  test('sponsor bestie - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Sponsor Bestie - Mobile');
  });
});

test.describe('Visual Regression Tests - Tablet (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('homepage - tablet', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage - Tablet');
  });

  test('community - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community - Tablet');
  });

  test('events - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Events - Tablet');
  });

  test('discussions - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Discussions - Tablet');
  });

  test('store - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Store - Tablet');
  });
});
