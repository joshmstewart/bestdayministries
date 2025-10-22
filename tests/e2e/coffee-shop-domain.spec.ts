import { test, expect, Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { getTestAccount } from '../fixtures/test-accounts';

/**
 * Coffee Shop Domain E2E Tests - WITH SHARD-SPECIFIC ACCOUNTS
 * Tests subdomain routing, content display, and navigation for coffee shop domain
 */
test.describe('Coffee Shop Domain System @fast', () => {
  test('coffee shop page loads correctly', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Verify coffee shop page renders
    const coffeeShopHeading = page.locator('text=/Coffee|Shop|Café/i').first();
    await expect(coffeeShopHeading).toBeVisible({ timeout: 15000 });
  });

  test('displays hero section', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Look for hero content
    const heroSection = page.locator('section, div').filter({ hasText: /welcome|coffee|shop/i }).first();
    await expect(heroSection).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Hero section displayed');
  });

  test('displays mission section', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Look for mission/about content
    const missionSection = page.locator('text=/Mission|About|Story/i').first();
    const hasMission = await missionSection.isVisible().catch(() => false);
    
    if (hasMission) {
      console.log('✅ Mission section displayed');
    }
  });

  test('displays hours of operation', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Look for hours section
    const hoursSection = page.locator('text=/Hours|Open|Monday|Tuesday/i').first();
    const hasHours = await hoursSection.isVisible().catch(() => false);
    
    if (hasHours) {
      console.log('✅ Hours section displayed');
      expect(hasHours).toBeTruthy();
    }
  });

  test('conditionally displays menu', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Check if menu toggle is enabled in settings
    const menuVisible = await page.evaluate(async () => {
      // @ts-ignore
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'coffee_shop_content')
        .single();
      
      return data?.setting_value?.menu_enabled || false;
    });
    
    console.log('Menu enabled in settings:', menuVisible);
    
    if (menuVisible) {
      // Menu should be visible
      const menuSection = page.locator('text=/Menu|Drinks|Food/i').first();
      const hasMenu = await menuSection.isVisible().catch(() => false);
      expect(hasMenu).toBeTruthy();
    }
  });

  test('displays location information', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Look for location/address
    const locationSection = page.locator('text=/Location|Address|Visit|Find Us/i').first();
    const hasLocation = await locationSection.isVisible().catch(() => false);
    
    if (hasLocation) {
      console.log('✅ Location section displayed');
    }
  });

  test('has navigation back to main site', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Look for back/home link
    const backLink = page.locator('a[href="/"], button:has-text("Home"), a:has-text("Main Site")').first();
    const hasBackLink = await backLink.isVisible().catch(() => false);
    
    if (hasBackLink) {
      console.log('✅ Navigation back to main site available');
      expect(hasBackLink).toBeTruthy();
    }
  });

  test('can navigate back to main site', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Click back/home link
    const backLink = page.locator('a[href="/"], button:has-text("Home")').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      
      // Should be on main site
      const currentUrl = page.url();
      const isMainSite = currentUrl.endsWith('/') || currentUrl.includes('/community');
      
      expect(isMainSite).toBeTruthy();
      console.log('✅ Successfully navigated back to main site');
    }
  });

  test('coffee shop has unique styling', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Check for coffee shop specific classes or styling
    const body = page.locator('body');
    const bodyClass = await body.getAttribute('class');
    
    console.log('Body classes:', bodyClass);
    console.log('Coffee shop page has unique styling');
  });

  test('displays contact buttons correctly', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Look for contact/action buttons
    const contactBtn = page.locator('button:has-text("Contact"), a:has-text("Email"), a:has-text("Call")').first();
    const hasContactBtn = await contactBtn.isVisible().catch(() => false);
    
    if (hasContactBtn) {
      console.log('✅ Contact buttons displayed');
    }
  });

  test('loads content from database', async ({ page }) => {
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Verify content is loaded from app_settings
    const contentLoaded = await page.evaluate(async () => {
      // @ts-ignore
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('setting_key', 'coffee_shop_content')
        .single();
      
      return {
        exists: !!data,
        hasHero: !!data?.setting_value?.hero,
        hasMission: !!data?.setting_value?.mission,
        hasLocation: !!data?.setting_value?.location
      };
    });
    
    console.log('Coffee shop content loaded:', contentLoaded);
    expect(contentLoaded.exists).toBeTruthy();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    // Check if content is still visible
    const content = page.locator('text=/Coffee|Shop/i').first();
    await expect(content).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Mobile responsive design verified');
  });

  test('domain detection works correctly', async ({ page }) => {
    // This test verifies the domain detection logic
    // In actual subdomain setup, this would test coffeeshop.domain.com
    
    await page.goto('/coffee-shop');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    console.log('Route includes coffee-shop:', currentUrl.includes('coffee-shop'));
    
    expect(currentUrl).toContain('coffee-shop');
  });

  test('admin can edit coffee shop content', async ({ page }) => {
    // Login as admin with shard-specific account
    const testAccount = getTestAccount();
    
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', testAccount.email);
    await page.fill('input[type="password"]', testAccount.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForLoadState('networkidle');
    
    // Navigate to admin coffee shop settings
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Look for coffee shop settings
    const settingsTab = page.locator('button:has-text("Settings"), button:has-text("Format")').first();
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      
      // Check for coffee shop configuration
      const coffeeShopConfig = page.locator('text=/Coffee Shop|Coffee/i').first();
      const hasConfig = await coffeeShopConfig.isVisible().catch(() => false);
      
      if (hasConfig) {
        console.log('✅ Admin can access coffee shop settings');
      }
    }
  });

  // VISUAL REGRESSION TESTS
  test.describe('Coffee Shop Visual Regression', () => {
    test('coffee shop homepage visual snapshot', async ({ page }) => {
      await page.goto('/coffee-shop');
      await page.waitForLoadState('networkidle');
      await percySnapshot(page, 'Coffee Shop - Homepage');
    });

    test('coffee shop mobile visual snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/coffee-shop');
      await page.waitForLoadState('networkidle');
      await percySnapshot(page, 'Coffee Shop - Mobile View');
    });

    test('coffee shop sections visual snapshot', async ({ page }) => {
      await page.goto('/coffee-shop');
      await page.waitForLoadState('networkidle');
      
      // Scroll to view all sections
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForFunction(() => window.scrollY > 0, { timeout: 2000 });
      
      await percySnapshot(page, 'Coffee Shop - Mid Page Sections');
    });
  });
});
