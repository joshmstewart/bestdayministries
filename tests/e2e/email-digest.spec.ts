/**
 * E2E Email Tests - Digest Emails
 * 
 * Tests digest email functionality by verifying database logs.
 * Tests ACTUAL Resend integration, not mocks.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/resend-test-helper';

test.describe('Digest Email Tests', () => {
  test('daily digest email sends for users with unread notifications @email @digest', async () => {
    test.setTimeout(60000);

    // Get a user with notification preferences
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);

    if (!users || users.length === 0) {
      console.log('⚠️ No users found, skipping test');
      test.skip();
      return;
    }

    const testUser = users[0];

    // Create test notifications for the user
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

    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);

    if (!users || users.length === 0) {
      test.skip();
      return;
    }

    const testUser = users[0];

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

    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);

    if (!users || users.length === 0) {
      test.skip();
      return;
    }

    const testUser = users[0];

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
