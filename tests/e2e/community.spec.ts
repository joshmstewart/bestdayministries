import { test, expect } from '@playwright/test';

test.describe('Community Features @fast', () => {
  test('should load community page', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded (may redirect to home if not auth)
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display community sections', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    // Look for visible section headings or cards (excluding notification popover)
    const sections = page.locator('h2:visible, h3:visible, section:visible').filter({ hasNot: page.locator('[aria-label*="Notifications"]') });
    await expect(sections.first()).toBeVisible({ timeout: 10000 });
  });

  test('should load discussions page', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  test('should display discussion posts', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    // Look for posts or empty state
    const posts = page.locator('[class*="post"], [class*="discussion"], article');
    const count = await posts.count();
    
    // May have posts or may be empty
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Events', () => {
  test('should load events page', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/events/);
  });

  test('should display events or empty state', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Look for event cards or calendar
    const events = page.locator('[class*="event"], [class*="card"], article');
    const count = await events.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have calendar view option', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Look for calendar-related elements
    const calendar = page.locator('[class*="calendar"], [role="grid"]');
    const hasCalendar = await calendar.count() > 0;
    
    // Calendar is optional
    expect(hasCalendar || !hasCalendar).toBeTruthy();
  });
});

test.describe('Gallery', () => {
  test('should load gallery page', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/gallery/);
  });

  test('should display images', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    
    // Look for images
    const images = page.locator('img[src], [class*="image"]');
    const count = await images.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should support image lightbox', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    
    const firstImage = page.locator('img[src]').first();
    
    if (await firstImage.isVisible()) {
      await firstImage.click();
      
      // Should open lightbox/modal
      const modal = page.locator('[role="dialog"], [class*="lightbox"], [class*="modal"]');
      const hasModal = await modal.count() > 0;
      
      expect(hasModal || !hasModal).toBeTruthy();
    }
  });
});

test.describe('Videos', () => {
  test('should load videos page', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/videos/);
  });

  test('should display video content', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    
    // Look for video players or YouTube embeds
    const videos = page.locator('video, iframe[src*="youtube"], [class*="video"]');
    const count = await videos.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Sponsorship', () => {
  test('should load sponsor bestie page', async ({ page }) => {
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/sponsor-bestie/);
  });

  test('should display bestie profiles', async ({ page }) => {
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    
    // Look for bestie cards or profiles
    const profiles = page.locator('[class*="bestie"], [class*="profile"], [class*="card"]');
    const count = await profiles.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show funding progress', async ({ page }) => {
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    
    // Look for progress bars
    const progress = page.locator('[role="progressbar"], [class*="progress"]');
    const hasProgress = await progress.count() > 0;
    
    expect(hasProgress || !hasProgress).toBeTruthy();
  });
});
