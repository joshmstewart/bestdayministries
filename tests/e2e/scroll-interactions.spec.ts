import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseDatabase, MockSupabaseState } from '../utils/supabase-mocks';

test.describe('Scroll Interactions', () => {
  let state: MockSupabaseState;

  test.beforeEach(async ({ page }) => {
    state = new MockSupabaseState();
    await mockSupabaseAuth(page, state);
    await mockSupabaseDatabase(page, state);
  });

  test('header buttons remain clickable after scrolling down', async ({ page }) => {
    // Navigate to a page with scrollable content
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Wait for header to be visible
    await page.waitForSelector('header', { state: 'visible' });

    // Verify notification bell is clickable before scroll
    const notificationBell = page.getByRole('button', { name: /notifications/i }).first();
    await expect(notificationBell).toBeVisible();
    await expect(notificationBell).toBeEnabled();

    // Scroll down significantly (simulate being far down the page)
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForFunction(() => window.scrollY >= 1800, { timeout: 2000 });

    // Verify header is still visible
    await expect(page.locator('header')).toBeVisible();

    // Verify buttons are still clickable after scroll
    await expect(notificationBell).toBeVisible();
    await expect(notificationBell).toBeEnabled();
    
    // Try clicking the notification bell
    await notificationBell.click();
    
    // Verify popover opened (notification bell should open a popover)
    await expect(page.getByText(/no notifications/i).or(page.getByRole('button', { name: /view all notifications/i }))).toBeVisible({ timeout: 3000 });
  });

  test('admin button remains clickable after scrolling', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Find Admin button
    const adminButton = page.getByRole('button', { name: /admin/i }).first();
    await expect(adminButton).toBeVisible();

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForFunction(() => window.scrollY >= 1400, { timeout: 2000 });

    // Verify still clickable
    await expect(adminButton).toBeVisible();
    await expect(adminButton).toBeEnabled();
    await adminButton.click();
  });

  test('profile dropdown remains functional after scrolling', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');

    // Scroll down the page
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForFunction(() => window.scrollY >= 900, { timeout: 2000 });

    // Find and click profile dropdown trigger
    const profileButton = page.locator('header').getByRole('button').filter({ hasText: /profile/i }).first();
    await expect(profileButton).toBeVisible();
    await profileButton.click();

    // Verify dropdown menu appears
    await expect(page.getByRole('menuitem', { name: /profile settings/i }).or(page.getByText(/profile settings/i))).toBeVisible({ timeout: 3000 });
  });

  test('navigation menu remains clickable after scroll up and down', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForFunction(() => window.scrollY >= 1800, { timeout: 2000 });
    
    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForFunction(() => window.scrollY <= 600, { timeout: 2000 });

    // Verify nav links are clickable
    const communityLink = page.locator('nav a[href="/community"]').or(page.locator('header a[href="/community"]')).first();
    if (await communityLink.isVisible()) {
      await expect(communityLink).toBeEnabled();
      await communityLink.click();
      await expect(page).toHaveURL(/\/community/);
    }
  });

  test('mobile menu remains functional after scrolling', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/community');
    await page.waitForLoadState('networkidle');

    // Scroll down on mobile
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForFunction(() => window.scrollY >= 900, { timeout: 2000 });

    // Find and click mobile menu button
    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    if (await menuButton.isVisible()) {
      await expect(menuButton).toBeEnabled();
      await menuButton.click();
      
      // Verify mobile menu opens
      await expect(page.locator('[role="dialog"]').or(page.locator('nav').filter({ hasText: /community|events/i }))).toBeVisible({ timeout: 3000 });
    }
  });

  test('z-index layering prevents content overlap', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Get header z-index
    const header = page.locator('header').first();
    const headerZIndex = await header.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });

    // Verify header has appropriate z-index (should be at least 50)
    const zIndexValue = parseInt(headerZIndex);
    expect(zIndexValue).toBeGreaterThanOrEqual(50);

    // Scroll down and verify header is still on top visually
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForFunction(() => window.scrollY >= 1800, { timeout: 2000 });

    // Header should still be visible and interactable
    await expect(header).toBeVisible();
    const notificationBell = page.getByRole('button', { name: /notifications/i }).first();
    await expect(notificationBell).toBeEnabled();
  });
});
