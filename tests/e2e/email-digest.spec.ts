/**
 * E2E Email Tests - Digest Emails
 * 
 * Tests digest email functionality by verifying database logs.
 * Tests ACTUAL Resend integration, not mocks.
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

test.describe('Digest Email Tests', () => {
  let seedData: any;
  let sponsorClient: any;

  test.beforeAll(async () => {
    // Seed test data once
    const testRunId = Date.now().toString();
    const { data, error } = await supabase.functions.invoke('seed-email-test-data', {
      body: { testRunId }
    });

    if (error) {
      throw new Error(`Failed to seed test data: ${error.message}`);
    }

    seedData = data;
    sponsorClient = await getAuthenticatedClient(
      seedData.authSessions.sponsor.access_token,
      seedData.authSessions.sponsor.refresh_token
    );
  });

  test('daily digest email sends for users with unread notifications @email @digest', async () => {
    test.setTimeout(60000);

    // Use seeded sponsor user
    const testUser = {
      id: seedData.userIds.sponsor,
      email: `${seedData.emailPrefix}-sponsor@test.com`
    };

    // Create test notifications for the user using authenticated client
    const notifications = [
      {
        user_id: testUser.id,
        type: 'comment_on_post',
        title: 'New Comment',
        message: 'Someone commented on your post',
        is_read: false,
      },
      {
        user_id: testUser.id,
        type: 'new_sponsor_message',
        title: 'New Message',
        message: 'You have a new sponsor message',
        is_read: false,
      },
    ];

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    expect(notifError).toBeNull();

    // Trigger digest email via edge function
    const { data: digestData, error: digestError } = await supabase.functions.invoke(
      'send-digest-email',
      {
        body: { frequency: 'daily' }
      }
    );

    // Wait for email log
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify email was logged in digest_emails_log
    const { data: emailLog } = await supabase
      .from('digest_emails_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('frequency', 'daily')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);
    expect(emailLog![0].notification_count).toBeGreaterThanOrEqual(2);

    console.log('✅ Daily digest email test passed');
  });

  test('weekly digest email aggregates multiple notifications @email @digest', async () => {
    test.setTimeout(60000);

    const testUser = {
      id: seedData.userIds.sponsor,
      email: `${seedData.emailPrefix}-sponsor@test.com`
    };

    // Create multiple unread notifications
    const notifications = Array.from({ length: 5 }, (_, i) => ({
      user_id: testUser.id,
      type: 'comment_on_post',
      title: `Notification ${i + 1}`,
      message: `Test notification ${i + 1}`,
      is_read: false,
    }));

    await supabase.from('notifications').insert(notifications);

    // Trigger weekly digest
    await supabase.functions.invoke('send-digest-email', {
      body: { frequency: 'weekly' }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify weekly digest log
    const { data: emailLog } = await supabase
      .from('digest_emails_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('frequency', 'weekly')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);
    expect(emailLog![0].notification_count).toBeGreaterThanOrEqual(5);

    console.log('✅ Weekly digest email test passed');
  });

  test('digest respects user notification preferences @email @digest', async () => {
    test.setTimeout(60000);

    const testUser = {
      id: seedData.userIds.sponsor,
      email: `${seedData.emailPrefix}-sponsor@test.com`
    };

    // Disable digest emails for user
    await supabase
      .from('notification_preferences')
      .upsert({
        user_id: testUser.id,
        enable_digest_emails: false,
        digest_frequency: 'daily'
      });

    // Create notifications
    await supabase.from('notifications').insert({
      user_id: testUser.id,
      type: 'comment_on_post',
      title: 'Test',
      message: 'Test message',
      is_read: false,
    });

    const beforeCount = await supabase
      .from('digest_emails_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);

    // Trigger digest
    await supabase.functions.invoke('send-digest-email', {
      body: { frequency: 'daily' }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const afterCount = await supabase
      .from('digest_emails_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);

    // Should not send email if disabled
    expect(afterCount.count).toBe(beforeCount.count);

    console.log('✅ Digest preferences test passed');
  });
});
