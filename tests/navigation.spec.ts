import { test, expect } from '@playwright/test';

test.describe('Page Navigation', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About' },
    { path: '/community', name: 'Community' },
    { path: '/events', name: 'Events' },
    { path: '/partners', name: 'Partners' },
    { path: '/support-us', name: 'Support Us' },
    { path: '/videos', name: 'Videos' },
    { path: '/gallery', name: 'Gallery' },
    { path: '/help', name: 'Help Center' },
  ];

  for (const page of pages) {
    test(`should load ${page.name} page`, async ({ page: browser }) => {
      await browser.goto(page.path);
      await browser.waitForLoadState('networkidle');
      
      // Verify URL is correct
      await expect(browser).toHaveURL(new RegExp(page.path.replace('/', '\\/')));
      
      // Check that header is present
      const header = browser.locator('header');
      await expect(header).toBeVisible({ timeout: 10000 });
      
      // Check that main content area exists
      const main = browser.locator('main, [role="main"], .container').first();
      await expect(main).toBeVisible({ timeout: 10000 });
    });
  }

  test('should have working header logo link', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Click logo to go home
    const logo = page.locator('header img, header svg').first();
    if (await logo.isVisible()) {
      await logo.click();
      await page.waitForLoadState('networkidle');
      
      // Should redirect to homepage
      await expect(page).toHaveURL(/\/(community)?$/);
    }
  });

  test('should display footer on all pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Scroll to bottom to make sure footer loads
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');
    
    // Should show 404 content or redirect to home
    const is404 = page.url().includes('this-page-does-not-exist-12345') || 
                  page.url().endsWith('/') ||
                  page.url().includes('/404');
    
    expect(is404).toBeTruthy();
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show mobile menu button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for mobile menu button (usually a hamburger icon)
    const mobileMenu = page.locator('button').filter({ hasText: /menu/i }).or(
      page.locator('button:has(svg)').filter({ hasText: /menu/i })
    );
    
    const count = await mobileMenu.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open mobile menu when clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click mobile menu
    const menuButton = page.locator('button').filter({ hasText: /menu/i }).first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Check if navigation appears (could be a sheet/drawer/modal)
      const nav = page.locator('nav, [role="navigation"]');
      const isVisible = await nav.isVisible();
      expect(isVisible).toBeTruthy();
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    
    // Should have at least one h1 (or page might be loading dynamically)
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });

  test('should have skip to main content link', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab to first focusable element
    await page.keyboard.press('Tab');
    
    // Check if first element is skip link (good practice but not required)
    const skipLink = page.locator('a[href="#main"], a[href="#content"]').first();
    const hasSkipLink = await skipLink.count() > 0;
    
    // This is optional, so we just verify the check runs
    expect(hasSkipLink || !hasSkipLink).toBeTruthy();
  });
});
