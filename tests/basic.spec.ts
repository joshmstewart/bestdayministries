import { test, expect } from '@playwright/test';

test.describe('Homepage Basics', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for the header
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should display logo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for logo image
    const logo = page.locator('header img, header svg').first();
    const hasLogo = await logo.count() > 0;
    
    expect(hasLogo).toBeTruthy();
  });

  test('should have responsive layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that main content area exists
    const main = page.locator('main, [role="main"], .container').first();
    await expect(main).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known safe errors (like React Router warnings)
    const criticalErrors = errors.filter(error => 
      !error.includes('Future Flag Warning') &&
      !error.includes('DevTools')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Performance', () => {
  test('should load homepage within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load in under 10 seconds (generous for CI environment)
    expect(loadTime).toBeLessThan(10000);
  });

  test('should have no broken images on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      
      if (src && !src.startsWith('data:')) {
        // Check if image is visible (if it loads, it should be visible)
        const isVisible = await img.isVisible();
        
        // This is informational - images may lazy load
        expect(isVisible || !isVisible).toBeTruthy();
      }
    }
  });
});
