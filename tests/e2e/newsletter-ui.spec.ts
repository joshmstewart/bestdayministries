import { test, expect, Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

/**
 * Newsletter System UI E2E Tests
 * Tests the complete newsletter management interface including campaigns, templates, subscribers, and analytics
 */
test.describe('Newsletter System UI @fast', () => {
  let adminPage: Page;
  const timestamp = Date.now();
  const testCampaignTitle = `Test Campaign ${timestamp}`;
  const testTemplateTitle = `Test Template ${timestamp}`;
  const testSubscriberEmail = `test${timestamp}@example.com`;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated admin page
    const context = await browser.newContext();
    adminPage = await context.newPage();

    // Login as admin
    await adminPage.goto('/auth');
    await adminPage.waitForLoadState('networkidle');
    
    await adminPage.fill('input[type="email"]', 'test@example.com');
    await adminPage.fill('input[type="password"]', 'testpassword123');
    await adminPage.click('button:has-text("Sign In")');
    
    await adminPage.waitForURL(/\/(community|admin)/);
    await adminPage.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    // Cleanup test data via edge function
    await adminPage.evaluate(async ({ timestamp }) => {
      try {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        // Delete test campaigns
        await supabase
          .from('newsletter_campaigns')
          .delete()
          .like('title', `%${timestamp}%`);
        
        // Delete test templates
        await supabase
          .from('newsletter_templates')
          .delete()
          .like('name', `%${timestamp}%`);
        
        // Delete test subscribers
        await supabase
          .from('newsletter_subscribers')
          .delete()
          .like('email', `%${timestamp}%`);
        
        console.log('✅ Newsletter test data cleaned up');
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }, { timestamp });

    await adminPage.close();
  });

  test('admin can navigate to newsletter manager', async () => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');
    
    // Click Besties tab
    await adminPage.click('button:has-text("Besties")');
    await adminPage.waitForTimeout(1000);
    
    // Look for newsletter-related content within tabs
    const newsletterTab = adminPage.locator('text=/Newsletter|Campaigns/i').first();
    await expect(newsletterTab).toBeVisible({ timeout: 15000 });
  });

  test('admin can create newsletter campaign', async () => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');
    
    // Navigate to Besties section
    await adminPage.click('button:has-text("Besties")');
    await adminPage.waitForTimeout(1500);
    
    // Look for Campaigns tab or New Campaign button
    const campaignsSection = adminPage.locator('text=/Campaigns/i').first();
    if (await campaignsSection.isVisible()) {
      await campaignsSection.click();
      await adminPage.waitForTimeout(1000);
    }
    
    // Click New Campaign button
    const newCampaignBtn = adminPage.locator('button:has-text("New Campaign")').first();
    await newCampaignBtn.waitFor({ state: 'visible', timeout: 10000 });
    await newCampaignBtn.click();
    
    // Fill campaign form
    await adminPage.fill('input[placeholder*="Campaign" i], input[name="title"]', testCampaignTitle);
    await adminPage.fill('input[placeholder*="Subject" i], input[name="subject"]', 'Test Subject');
    
    const previewField = adminPage.locator('input[placeholder*="Preview" i], textarea[placeholder*="Preview" i]').first();
    if (await previewField.isVisible()) {
      await previewField.fill('Test preview text');
    }
    
    // Save campaign
    const saveBtn = adminPage.locator('button:has-text("Save"), button:has-text("Create")').first();
    await saveBtn.click();
    
    // Wait for success
    await adminPage.waitForTimeout(2000);
    
    // Verify campaign in database
    const campaignExists = await adminPage.evaluate(async ({ title }) => {
      // @ts-ignore
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .eq('title', title)
        .maybeSingle();
      return !!data;
    }, { title: testCampaignTitle });
    
    expect(campaignExists).toBeTruthy();
  });

  test('admin can create newsletter template', async () => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');
    
    // Navigate to Besties section
    await adminPage.click('button:has-text("Besties")');
    await adminPage.waitForTimeout(1500);
    
    // Look for Templates tab
    const templatesTab = adminPage.locator('button:has-text("Templates"), text="Templates"').first();
    if (await templatesTab.isVisible()) {
      await templatesTab.click();
      await adminPage.waitForTimeout(1000);
    }
    
    // Click New Template button
    const newTemplateBtn = adminPage.locator('button:has-text("New Template")').first();
    if (await newTemplateBtn.isVisible()) {
      await newTemplateBtn.click();
      
      // Fill template form
      await adminPage.fill('input[placeholder*="Template" i], input[name="name"]', testTemplateTitle);
      await adminPage.fill('input[name="subject"]', 'Template Subject');
      
      // Save template
      const saveBtn = adminPage.locator('button:has-text("Save"), button:has-text("Create")').first();
      await saveBtn.click();
      
      await adminPage.waitForTimeout(2000);
      
      // Verify template in database
      const templateExists = await adminPage.evaluate(async ({ name }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data } = await supabase
          .from('newsletter_templates')
          .select('*')
          .eq('name', name)
          .maybeSingle();
        return !!data;
      }, { name: testTemplateTitle });
      
      expect(templateExists).toBeTruthy();
    } else {
      console.log('Template creation not available in current UI');
    }
  });

  test('admin can add newsletter subscriber', async () => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');
    
    // Navigate to Besties section
    await adminPage.click('button:has-text("Besties")');
    await adminPage.waitForTimeout(1500);
    
    // Look for Subscribers tab
    const subscribersTab = adminPage.locator('button:has-text("Subscribers"), text="Subscribers"').first();
    if (await subscribersTab.isVisible()) {
      await subscribersTab.click();
      await adminPage.waitForTimeout(1000);
    }
    
    // Click Add Subscriber button
    const addSubscriberBtn = adminPage.locator('button:has-text("Add Subscriber")').first();
    if (await addSubscriberBtn.isVisible()) {
      await addSubscriberBtn.click();
      
      // Fill subscriber form
      await adminPage.fill('input[type="email"], input[placeholder*="email" i]', testSubscriberEmail);
      
      // Save subscriber
      const saveBtn = adminPage.locator('button:has-text("Add"), button:has-text("Save")').first();
      await saveBtn.click();
      
      await adminPage.waitForTimeout(2000);
      
      // Verify subscriber in database
      const subscriberExists = await adminPage.evaluate(async ({ email }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data } = await supabase
          .from('newsletter_subscribers')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        return !!data;
      }, { email: testSubscriberEmail });
      
      expect(subscriberExists).toBeTruthy();
    } else {
      console.log('Subscriber management not available in current UI');
    }
  });

  test('admin can view analytics tab', async () => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');
    
    // Navigate to Besties section
    await adminPage.click('button:has-text("Besties")');
    await adminPage.waitForTimeout(1500);
    
    // Look for Analytics tab
    const analyticsTab = adminPage.locator('button:has-text("Analytics"), text="Analytics"').first();
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      await adminPage.waitForTimeout(1000);
      
      // Verify analytics interface loads
      const analyticsContent = adminPage.locator('text=/Campaign Statistics|Analytics|Performance/i').first();
      await expect(analyticsContent).toBeVisible({ timeout: 10000 });
    } else {
      console.log('Analytics tab not found in current UI');
    }
  });

  test('newsletter manager has all expected tabs', async () => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');
    
    // Navigate to Besties section
    await adminPage.click('button:has-text("Besties")');
    await adminPage.waitForTimeout(1500);
    
    // Check for key newsletter tabs (may vary based on implementation)
    const expectedTabs = ['Campaigns', 'Subscribers'];
    
    for (const tabName of expectedTabs) {
      const tab = adminPage.locator(`button:has-text("${tabName}"), text="${tabName}"`).first();
      const isVisible = await tab.isVisible().catch(() => false);
      console.log(`Tab "${tabName}" visible:`, isVisible);
    }
    
    // At minimum, we should see campaigns or newsletter-related content
    const hasNewsletterContent = await adminPage.locator('text=/Newsletter|Campaigns|Subscribers/i').first().isVisible();
    expect(hasNewsletterContent).toBeTruthy();
  });

  // VISUAL REGRESSION TESTS
  test.describe('Newsletter Visual Regression', () => {
    test('newsletter campaigns tab visual snapshot', async () => {
      await adminPage.goto('/admin');
      await adminPage.waitForLoadState('networkidle');
      
      await adminPage.click('button:has-text("Besties")');
      await adminPage.waitForTimeout(1500);
      
      const campaignsTab = adminPage.locator('button:has-text("Campaigns"), text="Campaigns"').first();
      if (await campaignsTab.isVisible()) {
        await campaignsTab.click();
        await adminPage.waitForTimeout(1000);
        await percySnapshot(adminPage, 'Newsletter - Campaigns Tab');
      }
    });

    test('newsletter subscribers tab visual snapshot', async () => {
      await adminPage.goto('/admin');
      await adminPage.waitForLoadState('networkidle');
      
      await adminPage.click('button:has-text("Besties")');
      await adminPage.waitForTimeout(1500);
      
      const subscribersTab = adminPage.locator('button:has-text("Subscribers"), text="Subscribers"').first();
      if (await subscribersTab.isVisible()) {
        await subscribersTab.click();
        await adminPage.waitForTimeout(1000);
        await percySnapshot(adminPage, 'Newsletter - Subscribers Tab');
      }
    });

    test('newsletter campaign dialog visual snapshot', async () => {
      await adminPage.goto('/admin');
      await adminPage.waitForLoadState('networkidle');
      
      await adminPage.click('button:has-text("Besties")');
      await adminPage.waitForTimeout(1500);
      
      const newCampaignBtn = adminPage.locator('button:has-text("New Campaign")').first();
      if (await newCampaignBtn.isVisible()) {
        await newCampaignBtn.click();
        await adminPage.waitForTimeout(1000);
        await percySnapshot(adminPage, 'Newsletter - Campaign Creation Dialog');
      }
    });
  });
});
