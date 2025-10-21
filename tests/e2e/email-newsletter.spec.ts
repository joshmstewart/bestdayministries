/**
 * E2E Email Tests - Newsletter System
 * 
 * Comprehensive tests for newsletter campaigns, subscribers, and email delivery.
 * Tests verify database state and edge function execution.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/resend-test-helper';

test.describe('Newsletter System Tests', () => {
  let seedData: any;
  let adminPage: any;

  test.beforeAll(async ({ browser }) => {
    // Seed test data with admin user
    const { data, error } = await supabase.functions.invoke('seed-email-test-data', {
      body: { 
        includeAdmin: true,
        includeGuardian: true,
        includeBestie: true,
        includeSponsor: true
      },
    });

    if (error) throw new Error(`Failed to seed test data: ${error.message}`);
    
    seedData = data;
    console.log('✅ Seeded newsletter test data:', seedData);

    // PRIORITY 5 FIX: Properly set up authenticated admin session
    // Create admin page with proper authentication context
    const context = await browser.newContext();
    adminPage = await context.newPage();
    
    // Navigate to the app first
    await adminPage.goto('/');
    
    // Wait for the page to fully load
    await adminPage.waitForLoadState('networkidle');
    
    // Set admin auth session in localStorage with proper format
    await adminPage.evaluate(
      ({ access_token, refresh_token, admin_id }) => {
        const projectId = 'nbvijawmjkycyweioglk'; // Your Supabase project ID
        const authKey = `sb-${projectId}-auth-token`;
        
        localStorage.setItem(
          authKey,
          JSON.stringify({
            access_token,
            refresh_token,
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: { 
              id: admin_id,
              email: `emailtest-newsletter-test-admin@test.com`,
              role: 'authenticated'
            },
          })
        );
        
        console.log('Set auth token for admin:', authKey);
      },
      {
        access_token: seedData.authSessions.admin.access_token,
        refresh_token: seedData.authSessions.admin.refresh_token,
        admin_id: seedData.userIds.admin,
      }
    );
    
    // Reload to apply authentication
    await adminPage.goto('/admin?tab=newsletter');
    await adminPage.waitForLoadState('networkidle');
    
    // Wait for admin UI to confirm authentication
    try {
      await adminPage.waitForSelector('text=Newsletter', { timeout: 15000 });
      console.log('✅ Admin authentication successful');
    } catch (e) {
      console.error('❌ Failed to authenticate admin user');
      throw new Error('Admin authentication failed - Newsletter tab not visible');
    }
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (seedData) {
      await supabase.functions.invoke('cleanup-test-data-unified', {
        body: {
          testRunId: seedData.testRunId,
          emailPrefix: seedData.emailPrefix 
        }
      });
      console.log('✅ Cleaned up newsletter test data');
    }
  });

  test('admin can create newsletter campaign @email', async () => {
    test.setTimeout(60000);

    await adminPage.goto('/admin');
    
    // Navigate to Newsletter section
    await adminPage.waitForSelector('text=Newsletter', { timeout: 10000 });
    await adminPage.click('text=Newsletter');
    
    // Wait for Campaigns tab
    await adminPage.waitForSelector('text=Campaigns', { timeout: 10000 });
    
    // Click New Campaign button
    await adminPage.click('button:has-text("New Campaign")');
    
    // Fill out campaign form
    const campaignSubject = `Test Campaign ${Date.now()}`;
    const campaignContent = 'This is a test newsletter campaign from E2E tests.';
    
    await adminPage.fill('input[name="subject"]', campaignSubject);
    await adminPage.fill('textarea[name="preview_text"]', 'Test preview text');
    
    // Wait for rich text editor and fill content
    await adminPage.waitForSelector('.ProseMirror', { timeout: 5000 });
    await adminPage.click('.ProseMirror');
    await adminPage.keyboard.type(campaignContent);
    
    // Save campaign
    await adminPage.click('button:has-text("Save")');
    
    // Wait for success message
    await expect(adminPage.getByText(/saved|created/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Verify campaign in database
    const { data: campaigns } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('subject', campaignSubject)
      .single();

    expect(campaigns).toBeTruthy();
    expect(campaigns.subject).toBe(campaignSubject);
    expect(campaigns.status).toBe('draft');

    console.log('✅ Campaign creation test passed');
  });

  test('admin can add newsletter subscribers @email', async () => {
    test.setTimeout(60000);

    await adminPage.goto('/admin');
    await adminPage.click('text=Newsletter');
    
    // Go to Subscribers tab
    await adminPage.click('text=Subscribers');
    await adminPage.waitForSelector('text=Email Subscribers', { timeout: 10000 });
    
    // Click Add Subscriber button
    await adminPage.click('button:has-text("Add Subscriber")');
    
    // Fill subscriber form
    const testEmail = `newsletter-test-${Date.now()}@example.com`;
    const testName = 'Newsletter Test User';
    
    await adminPage.fill('input[type="email"]', testEmail);
    await adminPage.fill('input[placeholder*="First"]', testName);
    
    // Submit
    await adminPage.click('button:has-text("Add")');
    
    // Wait for success
    await expect(adminPage.getByText(/added|success/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Verify subscriber in database
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', testEmail)
      .single();

    expect(subscriber).toBeTruthy();
    expect(subscriber.email).toBe(testEmail);
    expect(subscriber.status).toBe('active');

    console.log('✅ Subscriber addition test passed');
  });

  test('admin can configure organization settings @email', async () => {
    test.setTimeout(60000);

    await adminPage.goto('/admin');
    await adminPage.click('text=Newsletter');
    
    // Go to Settings tab
    await adminPage.click('text=Settings');
    await adminPage.waitForSelector('text=Organization Information', { timeout: 10000 });
    
    // Update organization info
    const orgName = 'Test Organization';
    const orgAddress = '123 Test St\nTest City, TS 12345';
    
    await adminPage.fill('input[id="organizationName"]', orgName);
    await adminPage.fill('textarea[id="organizationAddress"]', orgAddress);
    
    // Save settings
    await adminPage.click('button:has-text("Save Organization Settings")');
    
    // Wait for success
    await expect(adminPage.getByText(/saved|success/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Verify settings in database
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'newsletter_organization')
      .single();

    expect(settings).toBeTruthy();
    expect(settings.setting_value.name).toBe(orgName);
    expect(settings.setting_value.address).toBe(orgAddress);

    console.log('✅ Organization settings test passed');
  });

  test('admin can send test email @email', async () => {
    test.setTimeout(90000);

    // First create a campaign
    await adminPage.goto('/admin');
    await adminPage.click('text=Newsletter');
    await adminPage.click('text=Campaigns');
    
    await adminPage.click('button:has-text("New Campaign")');
    
    const campaignSubject = `Test Email Campaign ${Date.now()}`;
    await adminPage.fill('input[name="subject"]', campaignSubject);
    await adminPage.waitForSelector('.ProseMirror');
    await adminPage.click('.ProseMirror');
    await adminPage.keyboard.type('Test email content');
    
    await adminPage.click('button:has-text("Save")');
    await adminPage.waitForSelector('text=/saved|created/i', { timeout: 10000 });

    // Now find and click Send Test button
    await adminPage.waitForSelector('button:has-text("Send Test")', { timeout: 10000 });
    await adminPage.click('button:has-text("Send Test")');
    
    // Fill test email dialog
    const testEmail = `test-${Date.now()}@example.com`;
    await adminPage.fill('input[id="testEmail"]', testEmail);
    
    // Click Send Test in dialog
    await adminPage.click('button:has-text("Send Test"):not([variant="outline"])');
    
    // Wait for success message
    await expect(adminPage.getByText(/test email sent/i).first()).toBeVisible({
      timeout: 15000,
    });

    console.log('✅ Test email sending test passed');
  });

  test('newsletter sends to active subscribers @email', async () => {
    test.setTimeout(120000);

    // Create active subscribers
    const subscriber1Email = `sub1-${Date.now()}@example.com`;
    const subscriber2Email = `sub2-${Date.now()}@example.com`;
    
    await supabase
      .from('newsletter_subscribers')
      .insert([
        { email: subscriber1Email, status: 'active', first_name: 'Sub1' },
        { email: subscriber2Email, status: 'active', first_name: 'Sub2' },
      ]);

    // Create campaign
    const campaignSubject = `Production Campaign ${Date.now()}`;
    const { data: campaign } = await supabase
      .from('newsletter_campaigns')
      .insert({
        subject: campaignSubject,
        html_content: '<p>Test newsletter content</p>',
        status: 'draft',
        created_by: seedData.userIds.admin,
      })
      .select()
      .single();

    expect(campaign).toBeTruthy();

    // Trigger send via edge function in test mode
    const { error: sendError } = await supabase.functions.invoke('send-newsletter', {
      body: { campaignId: campaign.id, testMode: true }
    });

    expect(sendError).toBeNull();

    // Wait for campaign status to update
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify campaign status
    const { data: sentCampaign } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaign.id)
      .single();

    expect(sentCampaign.status).toBe('sent');
    expect(sentCampaign.sent_to_count).toBeGreaterThan(0);

    // Verify analytics logs
    const { data: analytics, count } = await supabase
      .from('newsletter_analytics')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaign.id)
      .eq('event_type', 'sent');

    expect(count).toBeGreaterThanOrEqual(2);

    console.log('✅ Newsletter send test passed');
  });

  test('user can unsubscribe from newsletter @email', async ({ page }) => {
    test.setTimeout(60000);

    // Create subscriber
    const testEmail = `unsubscribe-${Date.now()}@example.com`;
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: testEmail,
        status: 'active',
        first_name: 'Unsubscribe Test',
      })
      .select()
      .single();

    expect(subscriber).toBeTruthy();

    // Visit unsubscribe page
    await page.goto(`/unsubscribe-newsletter?id=${subscriber.id}`);

    // Wait for unsubscribe confirmation
    await expect(page.getByText(/unsubscribed|success/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Verify status in database
    const { data: unsubscribedUser } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('id', subscriber.id)
      .single();

    expect(unsubscribedUser.status).toBe('unsubscribed');
    expect(unsubscribedUser.unsubscribed_at).toBeTruthy();

    console.log('✅ Unsubscribe test passed');
  });

  test('user can manage newsletter preferences @email', async ({ page }) => {
    test.setTimeout(90000);

    // Create authenticated user context
    const context = await page.context();
    const userPage = await context.newPage();
    
    await userPage.goto('/');
    await userPage.evaluate(
      ({ access_token, refresh_token }) => {
        localStorage.setItem(
          `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`,
          JSON.stringify({
            access_token,
            refresh_token,
            expires_in: 3600,
            token_type: 'bearer',
          })
        );
      },
      {
        access_token: seedData.authSessions.sponsor.access_token,
        refresh_token: seedData.authSessions.sponsor.refresh_token,
      }
    );

    // Navigate to profile settings
    await userPage.goto('/profile-settings');
    
    // Click Newsletter tab
    await userPage.click('text=Newsletter');
    await userPage.waitForSelector('text=Newsletter Preferences', { timeout: 10000 });

    // Toggle subscription
    const subscribeSwitch = await userPage.locator('button[role="switch"]');
    const isSubscribed = await subscribeSwitch.getAttribute('data-state') === 'checked';
    
    await subscribeSwitch.click();
    
    // Wait for update
    await expect(userPage.locator('[role="status"], .toast').first()).toBeVisible({ timeout: 3000 }).catch(() => {});

    // Verify in database
    const sponsorEmail = `${seedData.emailPrefix}-sponsor@test.com`;
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('user_id', seedData.userIds.sponsor)
      .maybeSingle();

    if (isSubscribed) {
      expect(subscriber?.status).toBe('unsubscribed');
    } else {
      expect(subscriber?.status).toBe('active');
    }

    console.log('✅ Newsletter preferences test passed');
  });

  test('skips unsubscribed users when sending @email', async () => {
    test.setTimeout(90000);

    // Create active and unsubscribed subscribers
    const activeEmail = `active-${Date.now()}@example.com`;
    const unsubEmail = `unsub-${Date.now()}@example.com`;
    
    const { data: subscribers } = await supabase
      .from('newsletter_subscribers')
      .insert([
        { email: activeEmail, status: 'active' },
        { email: unsubEmail, status: 'unsubscribed' },
      ])
      .select();

    // Create and send campaign
    const { data: campaign } = await supabase
      .from('newsletter_campaigns')
      .insert({
        subject: `Filter Test ${Date.now()}`,
        html_content: '<p>Test content</p>',
        status: 'draft',
        created_by: seedData.userIds.admin,
      })
      .select()
      .single();

    await supabase.functions.invoke('send-newsletter', {
      body: { campaignId: campaign.id, testMode: true }
    });

    // Wait for send
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify only active subscriber received email
    const { data: sentAnalytics } = await supabase
      .from('newsletter_analytics')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('event_type', 'sent');

    const activeReceived = sentAnalytics?.some(a => a.email === activeEmail);
    const unsubReceived = sentAnalytics?.some(a => a.email === unsubEmail);

    expect(activeReceived).toBe(true);
    expect(unsubReceived).toBe(false);

    console.log('✅ Unsubscribed user filter test passed');
  });
});
