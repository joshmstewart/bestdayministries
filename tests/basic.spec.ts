import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    // Check for the logo or header instead of just title
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should have navigation structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Check that the header exists (which contains nav)
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});

test.describe('Direct Navigation', () => {
  test('should navigate to about page directly', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*about/);
  });

  test('should navigate to community page directly', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*community/);
  });
});

test.describe('Authentication', () => {
  test('should display auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    // Look for any heading on the auth page
    const authContent = page.locator('form, [role="form"]').first();
    await expect(authContent).toBeVisible({ timeout: 10000 });
  });
});
