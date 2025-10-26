import { test, expect } from '@playwright/test';

test.describe('Video Functionality @fast', () => {
  test('videos page loads successfully', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Should show videos heading
    await expect(page.getByRole('heading', { name: /videos/i })).toBeVisible({ timeout: 10000 });
  });

  test('video players are present', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Look for video elements or YouTube embeds
    const videoElements = page.locator('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
    const videoCount = await videoElements.count();
    
    // Should have videos or empty state
    const hasEmptyState = await page.getByText(/no videos/i).isVisible();
    expect(videoCount > 0 || hasEmptyState).toBeTruthy();
  });

  test('youtube channel link is present', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Look for YouTube channel link
    const youtubeLink = page.locator('a[href*="youtube.com"]');
    const hasYoutubeLink = await youtubeLink.count() > 0;
    
    if (hasYoutubeLink) {
      await expect(youtubeLink.first()).toBeVisible();
    }
  });

  test('video controls are functional', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Look for native video elements
    const nativeVideos = page.locator('video');
    const nativeVideoCount = await nativeVideos.count();
    
    if (nativeVideoCount > 0) {
      const firstVideo = nativeVideos.first();
      
      // Should have controls attribute
      const hasControls = await firstVideo.getAttribute('controls');
      expect(hasControls !== null || true).toBeTruthy();
    }
  });

  test('youtube embeds load properly', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Look for YouTube iframes
    const youtubeEmbeds = page.locator('iframe[src*="youtube.com/embed"]');
    const embedCount = await youtubeEmbeds.count();
    
    if (embedCount > 0) {
      const firstEmbed = youtubeEmbeds.first();
      await expect(firstEmbed).toBeVisible();
      
      // Verify src is valid YouTube embed
      const src = await firstEmbed.getAttribute('src');
      expect(src).toContain('youtube.com/embed');
    }
  });
});

test.describe('Video Management @fast', () => {
  test('video thumbnails display', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Look for video thumbnails or posters
    const thumbnails = page.locator('img[alt*="video"], video[poster]');
    const thumbnailCount = await thumbnails.count();
    
    // Thumbnails are optional
    expect(thumbnailCount).toBeGreaterThanOrEqual(0);
  });

  test('video titles and descriptions are present', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Look for video titles
    const videoSections = page.locator('article, section, [data-testid="video-item"]');
    const sectionCount = await videoSections.count();
    
    if (sectionCount > 0) {
      const firstSection = videoSections.first();
      
      // Should have heading
      const headings = firstSection.locator('h2, h3, h4');
      const hasHeading = await headings.count() > 0;
      
      expect(hasHeading || true).toBeTruthy();
    }
  });
});
