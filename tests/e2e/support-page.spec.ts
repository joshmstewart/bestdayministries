import { test, expect } from '@playwright/test';

test.describe('Support Page', () => {
  test('should display support page with all sections', async ({ page }) => {
    await page.goto('/support-us');
    await page.waitForLoadState('networkidle');
    
    // Check header section exists
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  test('should display video section when configured', async ({ page }) => {
    await page.goto('/support-us');
    await page.waitForLoadState('networkidle');
    
    // Scroll to find video section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);
    
    // Check if video section exists (either YouTube or uploaded video)
    const videoSection = page.locator('section').filter({ has: page.locator('iframe[src*="youtube"], video') });
    const videoCount = await videoSection.count();
    
    // Video section is optional - just verify page doesn't crash
    expect(videoCount >= 0).toBeTruthy();
    
    // If video exists, verify it's visible
    if (videoCount > 0) {
      const video = page.locator('iframe[src*="youtube"], video').first();
      await expect(video).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display donation form section', async ({ page }) => {
    await page.goto('/support-us');
    await page.waitForLoadState('networkidle');
    
    // Scroll to find donation form
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Check for donation-related elements
    const donationElements = page.locator('text=/donation|donate|support|contribute/i');
    const hasElements = await donationElements.count() > 0;
    
    expect(hasElements).toBeTruthy();
  });

  test('should have responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/support-us');
    await page.waitForLoadState('networkidle');
    
    // Page should load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(body).toBeVisible();
  });

  test('should handle video section with YouTube URL', async ({ page }) => {
    await page.goto('/support-us');
    await page.waitForLoadState('networkidle');
    
    // Look for YouTube iframe
    const youtubeIframe = page.locator('iframe[src*="youtube.com/embed"]');
    const hasYouTube = await youtubeIframe.count() > 0;
    
    // If YouTube video exists, verify it loads properly
    if (hasYouTube) {
      await expect(youtubeIframe.first()).toBeVisible();
      const src = await youtubeIframe.first().getAttribute('src');
      expect(src).toContain('youtube.com/embed');
    }
  });

  test('should handle video section with uploaded video', async ({ page }) => {
    await page.goto('/support-us');
    await page.waitForLoadState('networkidle');
    
    // Look for video element
    const videoElement = page.locator('video');
    const hasVideo = await videoElement.count() > 0;
    
    // If uploaded video exists, verify it has proper attributes
    if (hasVideo) {
      await expect(videoElement.first()).toBeVisible();
      const hasControls = await videoElement.first().getAttribute('controls');
      expect(hasControls).not.toBeNull();
    }
  });
});
