import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Visual Regression Tests', () => {
  test('homepage appearance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage');
  });

  test('community page appearance', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community Page');
  });

  test('events page appearance', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Events Page');
  });

  test('store page appearance', async ({ page }) => {
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Store Page');
  });

  test('sponsor bestie page appearance', async ({ page }) => {
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Sponsor Bestie Page');
  });

  test('auth page appearance', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Auth Page');
  });

  test('mobile viewport - homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage - Mobile');
  });

  test('mobile viewport - community', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community - Mobile');
  });
});
