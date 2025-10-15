/**
 * E2E Email Tests - Message Notifications
 * 
 * Tests message notification emails via database verification.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/test-helpers';

test.describe('Message Notification Email Tests', () => {
  test('sends email when sponsor sends message to bestie @email @messages', async () => {
    test.setTimeout(90000);

    // Get a sponsor-bestie relationship
    const { data: sponsorships } = await supabase
      .from('sponsorships')
      .select('*, sponsor_besties(*)')
      .eq('status', 'active')
      .limit(1);

    if (!sponsorships || sponsorships.length === 0) {
      console.log('⚠️ No active sponsorships found');
      test.skip();
      return;
    }

    const sponsorship = sponsorships[0];
    const bestieId = sponsorship.sponsor_besties.bestie_id;
    const sponsorId = sponsorship.sponsor_id;

    // Create a test message
    const { data: message, error: messageError } = await supabase
      .from('sponsor_messages')
      .insert({
        sponsor_bestie_id: sponsorship.sponsor_besties.id,
        sender_type: 'sponsor',
        sender_id: sponsorId,
        message_text: 'Test message from sponsor',
        approval_status: 'pending'
      })
      .select()
      .single();

    expect(messageError).toBeNull();

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
      test.skip();
      return;
    }

    const sponsorship = sponsorships[0];
    const bestieId = sponsorship.sponsor_besties.bestie_id;
    const sponsorId = sponsorship.sponsor_id;

    // Create message from bestie
    const { data: message, error: messageError } = await supabase
      .from('sponsor_messages')
      .insert({
        sponsor_bestie_id: sponsorship.sponsor_besties.id,
        sender_type: 'bestie',
        sender_id: bestieId,
        message_text: 'Test message from bestie',
        approval_status: 'approved'
      })
      .select()
      .single();

    expect(messageError).toBeNull();

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
      test.skip();
      return;
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
      test.skip();
      return;
    }

    // Create message from guardian
    const { data: message, error: messageError } = await supabase
      .from('sponsor_messages')
      .insert({
        sponsor_bestie_id: sponsorship.sponsor_besties.id,
        sender_type: 'guardian',
        sender_id: guardianLink.caregiver_id,
        message_text: 'Test message from guardian',
        approval_status: 'approved'
      })
      .select()
      .single();

    expect(messageError).toBeNull();

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

    console.log('✅ Guardian message notification test passed');
  });
});
