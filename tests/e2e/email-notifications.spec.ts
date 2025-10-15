/**
 * E2E Email Tests - Notification Emails
 * 
 * Tests notification email functionality via database verification.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/resend-test-helper';

test.describe('Notification Email Tests', () => {
  test('sends email for new comment notification @email @notifications', async () => {
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

    // Send notification via edge function
    const { error } = await supabase.functions.invoke('send-notification-email', {
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
    const { data: emailLog } = await supabase
      .from('email_notifications_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('notification_type', 'comment_on_post')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);
    expect(emailLog![0].status).toBe('sent');

    console.log('✅ Comment notification email test passed');
  });

  test('sends email for sponsor message notification @email @notifications', async () => {
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

    const { error } = await supabase.functions.invoke('send-notification-email', {
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

    const { data: emailLog } = await supabase
      .from('email_notifications_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('notification_type', 'new_sponsor_message')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);

    console.log('✅ Sponsor message notification email test passed');
  });

  test('sends email for product update notification @email @notifications', async () => {
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

    const { error } = await supabase.functions.invoke('send-notification-email', {
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

    const { data: emailLog } = await supabase
      .from('email_notifications_log')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('notification_type', 'product_update')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(emailLog).toBeTruthy();
    expect(emailLog!.length).toBeGreaterThan(0);

    console.log('✅ Product update notification email test passed');
  });

  test('respects email notification preferences @email @notifications', async () => {
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

    // Disable email notifications
    await supabase
      .from('notification_preferences')
      .upsert({
        user_id: testUser.id,
        enable_email_notifications: false
      });

    const beforeCount = await supabase
      .from('email_notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);

    // Try to send notification
    await supabase.functions.invoke('send-notification-email', {
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

    const afterCount = await supabase
      .from('email_notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);

    // Should not send if disabled
    expect(afterCount.count).toBe(beforeCount.count);

    console.log('✅ Notification preferences test passed');
  });
});
