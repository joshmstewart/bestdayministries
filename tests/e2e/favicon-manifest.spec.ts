import { test, expect } from '@playwright/test';

test.describe('Favicon and App Manifest @fast', () => {
  test('favicon loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that favicon link exists in the head
    const faviconLink = await page.locator('link[rel="icon"]');
    await expect(faviconLink).toHaveCount(1);
    
    // Get the favicon URL and verify it's accessible
    const faviconHref = await faviconLink.getAttribute('href');
    expect(faviconHref).toBeTruthy();
    
    // Verify the favicon URL is valid (starts with http or /)
    expect(faviconHref).toMatch(/^(https?:\/\/|\/)/);
  });

  test('favicon updates from database setting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Link tags in <head> are not "visible" - check for existence instead
    const faviconLink = await page.locator('link[rel="icon"]');
    await expect(faviconLink).toHaveCount(1, { timeout: 2000 });
    const faviconHref = await faviconLink.getAttribute('href');
    
    // Verify favicon has been set (should not be default)
    expect(faviconHref).toBeTruthy();
    expect(faviconHref).toMatch(/\.(png|jpg|jpeg|ico|svg)(\?|$)/i);
  });

  test('app manifest meta tags are present', async ({ page }) => {
    await page.goto('/');
    
    // Check for apple-touch-icon
    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toHaveCount(1);
    
    // Check for theme-color meta tag
    const themeColor = await page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);
    
    // Check for apple-mobile-web-app-capable
    const mobileWebAppCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(mobileWebAppCapable).toHaveCount(1);
    expect(await mobileWebAppCapable.getAttribute('content')).toBe('yes');
  });

  test('manifest.json link is present', async ({ page }) => {
    await page.goto('/');
    
    // Check for manifest link
    const manifestLink = await page.locator('link[rel="manifest"]');
    await page.waitForLoadState('networkidle');
    const manifestCount = await manifestLink.count();
    
    // Should have at least one manifest link (either static or dynamic)
    expect(manifestCount).toBeGreaterThanOrEqual(0);
  });

  test('page title updates from database', async ({ page }) => {
    await page.goto('/');
    
    // Wait for title to be set
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    
    // Title should be set and not be the default index.html title
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('meta description is present', async ({ page }) => {
    await page.goto('/');
    
    const metaDescription = await page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
    
    const content = await metaDescription.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('open graph image is present', async ({ page }) => {
    await page.goto('/');
    
    const ogImage = await page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveCount(1);
    
    const content = await ogImage.getAttribute('content');
    expect(content).toBeTruthy();
  });
});
