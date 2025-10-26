import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { getTestAccount } from '../fixtures/test-accounts';

// Helper function to log in before tests - WITH SHARD-SPECIFIC ACCOUNTS
async function login(page: any) {
  const testAccount = getTestAccount();
  
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  // Fill in login credentials (use shard-specific test account)
  await page.fill('input[type="email"]', testAccount.email);
  await page.fill('input[type="password"]', testAccount.password);
  
  // Click login button
  await page.click('button:has-text("Sign In")');
  
  // Wait for redirect after login
  await page.waitForURL(/\/(?!auth)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Visual Regression Tests - Desktop', () => {
  test('homepage appearance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage');
  });

  test('community page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community Page');
  });

  test('events page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Events Page');
  });

  test('discussions page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for any animations
    await percySnapshot(page, 'Discussions Page');
  });

  test('discussion detail dialog appearance', async ({ page }) => {
    await login(page);
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    // Click first post to open dialog
    const postCard = page.locator('[role="article"], .group').first();
    if (await postCard.isVisible()) {
      await postCard.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await page.waitForTimeout(500); // Wait for dialog animation
      await percySnapshot(page, 'Discussion Detail Dialog');
    }
  });

  test('store page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Store Page');
  });

  test('sponsor bestie page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Sponsor Bestie Page');
  });

  test('auth page appearance', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Auth Page');
  });

  test('support page appearance', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Support Page');
  });

  test('help center appearance', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Help Center');
  });
});

test.describe('Visual Regression Tests - Mobile (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('homepage - mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage - Mobile');
  });

  test('community - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community - Mobile');
  });

  test('events - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Events - Mobile');
  });

  test('store - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Store - Mobile');
  });

  test('auth - mobile', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Auth - Mobile');
  });

  test('sponsor bestie - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Sponsor Bestie - Mobile');
  });
});

test.describe('Visual Regression Tests - Tablet (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('homepage - tablet', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Homepage - Tablet');
  });

  test('community - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Community - Tablet');
  });

  test('events - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Events - Tablet');
  });

  test('discussions - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await percySnapshot(page, 'Discussions - Tablet');
  });

  test('discussion dialog - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCard = page.locator('[role="article"], .group').first();
    if (await postCard.isVisible()) {
      await postCard.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await page.waitForTimeout(500);
      await percySnapshot(page, 'Discussion Dialog - Tablet');
    }
  });

  test('store - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Store - Tablet');
  });
});

test.describe('Visual Regression Tests - Additional Desktop Pages', () => {
  test('about page appearance', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'About Page');
  });

  test('vendor auth page appearance', async ({ page }) => {
    await page.goto('/vendor-auth');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Vendor Auth Page');
  });

  test('newsletter page appearance', async ({ page }) => {
    await page.goto('/newsletter');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Newsletter Page');
  });

  test('coffee shop page appearance', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Coffee Shop Page');
  });

  test('guardian links page appearance', async ({ page }) => {
    await login(page);
    await page.goto('/guardian-links');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Guardian Links Page');
  });

  test('vendor dashboard appearance', async ({ page }) => {
    await login(page);
    await page.goto('/vendor-dashboard');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Vendor Dashboard');
  });

  test('notifications center appearance', async ({ page }) => {
    await login(page);
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Notifications Center');
  });

  test('admin dashboard appearance', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Admin Dashboard');
  });

  test('sticker album appearance', async ({ page }) => {
    await login(page);
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Sticker Album');
  });

  test('profile settings appearance', async ({ page }) => {
    await login(page);
    await page.goto('/profile-settings');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Profile Settings');
  });

  test('order history appearance', async ({ page }) => {
    await login(page);
    await page.goto('/order-history');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Order History');
  });
});

test.describe('Visual Regression Tests - Additional Mobile Pages', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('about - mobile', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'About - Mobile');
  });

  test('newsletter - mobile', async ({ page }) => {
    await page.goto('/newsletter');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Newsletter - Mobile');
  });

  test('coffee shop - mobile', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Coffee Shop - Mobile');
  });

  test('help center - mobile', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Help Center - Mobile');
  });

  test('support - mobile', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Support - Mobile');
  });

  test('discussions - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Discussions - Mobile');
  });

  test('admin - mobile', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Admin - Mobile');
  });
});

test.describe('Visual Regression Tests - Additional Tablet Pages', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('about - tablet', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'About - Tablet');
  });

  test('support - tablet', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Support - Tablet');
  });

  test('help center - tablet', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Help Center - Tablet');
  });

  test('sponsor bestie - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/sponsor-bestie');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Sponsor Bestie - Tablet');
  });

  test('admin - tablet', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Admin - Tablet');
  });
});
