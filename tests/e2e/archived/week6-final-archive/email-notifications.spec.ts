/**
 * E2E Email Tests - Notification Emails
 * 
 * Tests notification email functionality via database verification.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/resend-test-helper';
import { createClient } from '@supabase/supabase-js';

// Helper to create authenticated client
async function getAuthenticatedClient(accessToken: string, refreshToken: string) {
  const authClient = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );
  
  await authClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  return authClient;
}

test.describe('Notification Email Tests', () => {
  let seedData: any;
  let sponsorClient: any;
  const createdEmailLogIds: string[] = [];

  test.beforeAll(async () => {
    const testRunId = Date.now().toString();
    const { data, error } = await supabase.functions.invoke('seed-email-test-data-with-retry', {
      body: { testRunId }
    });

    if (error) {
      throw new Error(`Failed to seed test data: ${error.message}`);
    }

    seedData = data;

    // Create authenticated client for sponsor
    sponsorClient = await getAuthenticatedClient(
      seedData.authSessions.sponsor.access_token,
      seedData.authSessions.sponsor.refresh_token
    );
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (createdEmailLogIds.length > 0) {
      await supabase.from('email_notifications_log').delete().in('id', createdEmailLogIds);
      createdEmailLogIds.length = 0;
    }
  });

  test.afterAll(async () => {
    // Cleanup all seeded test data
    if (seedData) {
      console.log('🧹 Cleaning up test users and related data...');
      await supabase.functions.invoke('cleanup-test-data-unified', {
        body: { 
          testRunId: seedData.testRunId,
          emailPrefix: seedData.emailPrefix 
        }
      });
    }
  });

  test('sends email for new comment notification @email @notifications', async () => {
    test.setTimeout(60000);

    const testUser = {
      id: seedData.userIds.sponsor,
      email: `${seedData.emailPrefix}-sponsor@test.com`
    };

    // Send notification via edge function
    const { error } = await sponsorClient.functions.invoke('send-notification-email', {
      body: {
        userId: testUser.id,
        notificationType: 'comment_on_post',
        title: 'New Comment on Your Post',
        message: 'Someone commented on your discussion post',
        link: '/discussions',
        subject: 'New Comment Notification'
      }
    });

    expect(error).toBeNull();

    // Wait for email processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify email logged
    const { data: emailLog } = await sponsorClient
      .from('email_notifications_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('notification_type', 'comment_on_post')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);
    expect(emailLog![0].status).toBe('sent');
    if (emailLog && emailLog.length > 0) {
      createdEmailLogIds.push(emailLog[0].id);
    }

    console.log('✅ Comment notification email test passed');
  });

  test('sends email for sponsor message notification @email @notifications', async () => {
    test.setTimeout(60000);

    const testUser = {
      id: seedData.userIds.sponsor,
      email: `${seedData.emailPrefix}-sponsor@test.com`
    };

    const { error } = await sponsorClient.functions.invoke('send-notification-email', {
      body: {
        userId: testUser.id,
        notificationType: 'new_sponsor_message',
        title: 'New Sponsor Message',
        message: 'You have a new message from your sponsor',
        link: '/bestie-messages',
        subject: 'New Sponsor Message'
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: emailLog } = await sponsorClient
      .from('email_notifications_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('notification_type', 'new_sponsor_message')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);
    if (emailLog && emailLog.length > 0) {
      createdEmailLogIds.push(emailLog[0].id);
    }

    console.log('✅ Sponsor message notification email test passed');
  });

  test('sends email for product update notification @email @notifications', async () => {
    test.setTimeout(60000);

    const testUser = {
      id: seedData.userIds.sponsor,
      email: `${seedData.emailPrefix}-sponsor@test.com`
    };

    const { error } = await sponsorClient.functions.invoke('send-notification-email', {
      body: {
        userId: testUser.id,
        notificationType: 'product_update',
        title: 'New Product Available',
        message: 'Check out our new products in the marketplace',
        link: '/marketplace',
        subject: 'New Product Update'
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: emailLog } = await sponsorClient
      .from('email_notifications_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('notification_type', 'product_update')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);
    if (emailLog && emailLog.length > 0) {
      createdEmailLogIds.push(emailLog[0].id);
    }

    console.log('✅ Product update notification email test passed');
  });

  test('respects email notification preferences @email @notifications', async () => {
    test.setTimeout(60000);

    const testUser = {
      id: seedData.userIds.sponsor,
      email: `${seedData.emailPrefix}-sponsor@test.com`
    };

    // Disable email notifications
    await sponsorClient
      .from('notification_preferences')
      .upsert({
        user_id: testUser.id,
        enable_digest_emails: false
      });

    const beforeCount = await sponsorClient
      .from('email_notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);

    // Try to send notification
    await sponsorClient.functions.invoke('send-notification-email', {
      body: {
        userId: testUser.id,
        notificationType: 'comment_on_post',
        title: 'Test',
        message: 'Test message',
        link: '/test',
        subject: 'Test Subject'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const afterCount = await sponsorClient
      .from('email_notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);

    // Should not send if disabled
    expect(afterCount.count).toBe(beforeCount.count);

    console.log('✅ Notification preferences test passed');
  });
});
