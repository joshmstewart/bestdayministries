import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Joy House/i);
  });

  test('should have navigation', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to About page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=About');
    await expect(page).toHaveURL(/.*about/);
  });

  test('should navigate to Community page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Community');
    await expect(page).toHaveURL(/.*community/);
  });
});

test.describe('Authentication', () => {
  test('should display auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});
