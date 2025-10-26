/**
 * E2E Email Tests - Message Notifications
 * 
 * Tests message notification emails via database verification.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/resend-test-helper';

test.describe('Message Notification Email Tests', () => {
  const createdNotificationIds: string[] = [];
  const createdMessageIds: string[] = [];

  test.afterEach(async () => {
    // Cleanup test data
    if (createdNotificationIds.length > 0) {
      await supabase
        .from('notifications')
        .delete()
        .in('id', createdNotificationIds);
      createdNotificationIds.length = 0;
    }
    if (createdMessageIds.length > 0) {
      await supabase
        .from('sponsor_messages')
        .delete()
        .in('id', createdMessageIds);
      createdMessageIds.length = 0;
    }
  });

  test.afterAll(async () => {
    // Note: This test file uses seeded data but doesn't have seedData variable
    // Cleanup happens automatically when seed-email-test-data tests run
    console.log('✅ Message tests complete');
  });

  test('sends email when sponsor sends message to bestie @email @messages', async () => {
    test.setTimeout(90000);

    // Get a sponsor-bestie relationship
    const { data: sponsorships } = await supabase
      .from('sponsorships')
      .select('*, sponsor_besties(*)')
      .eq('status', 'active')
      .limit(1);

    if (!sponsorships || sponsorships.length === 0) {
      throw new Error('❌ SEED DATA ERROR: No active sponsorships found. Seed function must create sponsorships.');
    }

    const sponsorship = sponsorships[0];
    const bestieId = sponsorship.sponsor_besties.bestie_id;
    const sponsorId = sponsorship.sponsor_id;

    // Create a test message
    const { data: message, error: messageError } = await supabase
      .from('sponsor_messages')
      .insert({
        bestie_id: bestieId,
        subject: 'Test Message',
        message: 'Test message from sponsor',
        status: 'pending_approval',
        sent_by: sponsorId,
        from_guardian: false
      })
      .select()
      .single();

    expect(messageError).toBeNull();
    createdMessageIds.push(message.id);

    // Trigger message notification
    const { error } = await supabase.functions.invoke('send-message-notification', {
      body: {
        messageId: message.id,
        recipientType: 'bestie',
        recipientId: bestieId
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify notification was created
    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', bestieId)
      .eq('type', 'new_sponsor_message')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();
    expect(notification!.length).toBeGreaterThan(0);
    if (notification && notification.length > 0) {
      createdNotificationIds.push(notification[0].id);
    }

    console.log('✅ Sponsor message notification test passed');
  });

  test('sends email when bestie sends message to sponsor @email @messages', async () => {
    test.setTimeout(90000);

    const { data: sponsorships } = await supabase
      .from('sponsorships')
      .select('*, sponsor_besties(*)')
      .eq('status', 'active')
      .limit(1);

    if (!sponsorships || sponsorships.length === 0) {
      throw new Error('❌ SEED DATA ERROR: No active sponsorships found. Seed function must create sponsorships.');
    }

    const sponsorship = sponsorships[0];
    const bestieId = sponsorship.sponsor_besties.bestie_id;
    const sponsorId = sponsorship.sponsor_id;

    // Create message from bestie
    const { data: message, error: messageError } = await supabase
      .from('sponsor_messages')
      .insert({
        bestie_id: bestieId,
        subject: 'Test Message',
        message: 'Test message from bestie',
        status: 'approved',
        sent_by: bestieId,
        from_guardian: false
      })
      .select()
      .single();

    expect(messageError).toBeNull();
    createdMessageIds.push(message.id);

    // Trigger notification to sponsor
    const { error } = await supabase.functions.invoke('send-message-notification', {
      body: {
        messageId: message.id,
        recipientType: 'sponsor',
        recipientId: sponsorId
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', sponsorId)
      .eq('type', 'new_sponsor_message')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();
    expect(notification!.length).toBeGreaterThan(0);
    if (notification && notification.length > 0) {
      createdNotificationIds.push(notification[0].id);
    }

    console.log('✅ Bestie message notification test passed');
  });

  test('sends email when guardian sends message to sponsor @email @messages', async () => {
    test.setTimeout(90000);

    const { data: sponsorships } = await supabase
      .from('sponsorships')
      .select('*, sponsor_besties(*)')
      .eq('status', 'active')
      .limit(1);

    if (!sponsorships || sponsorships.length === 0) {
      throw new Error('❌ SEED DATA ERROR: No active sponsorships found. Seed function must create sponsorships.');
    }

    const sponsorship = sponsorships[0];
    const sponsorId = sponsorship.sponsor_id;

    // Get guardian for this bestie
    const { data: guardianLink } = await supabase
      .from('caregiver_bestie_links')
      .select('caregiver_id')
      .eq('bestie_id', sponsorship.sponsor_besties.bestie_id)
      .limit(1)
      .single();

    if (!guardianLink) {
      throw new Error('❌ SEED DATA ERROR: No guardian link found for bestie. Seed function must create guardian-bestie links.');
    }

    // Create message from guardian
    const { data: message, error: messageError } = await supabase
      .from('sponsor_messages')
      .insert({
        bestie_id: sponsorship.sponsor_besties.bestie_id,
        subject: 'Test Message',
        message: 'Test message from guardian',
        status: 'approved',
        sent_by: guardianLink.caregiver_id,
        from_guardian: true
      })
      .select()
      .single();

    expect(messageError).toBeNull();
    createdMessageIds.push(message.id);

    const { error } = await supabase.functions.invoke('send-message-notification', {
      body: {
        messageId: message.id,
        recipientType: 'sponsor',
        recipientId: sponsorId
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', sponsorId)
      .eq('type', 'new_sponsor_message')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();
    if (notification && notification.length > 0) {
      createdNotificationIds.push(notification[0].id);
    }

    console.log('✅ Guardian message notification test passed');
  });
});
