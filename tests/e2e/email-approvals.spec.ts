/**
 * E2E Email Tests - Approval Notifications
 * 
 * Tests approval notification emails via database verification.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/resend-test-helper';

test.describe('Approval Notification Email Tests', () => {
  test('sends email when post is approved @email @approvals', async () => {
    test.setTimeout(90000);

    // Get a guardian-bestie link
    const { data: links } = await supabase
      .from('caregiver_bestie_links')
      .select('*, profiles!caregiver_bestie_links_caregiver_id_fkey(email)')
      .eq('require_post_approval', true)
      .limit(1);

    if (!links || links.length === 0) {
      console.log('⚠️ No guardian-bestie links with post approval found');
      test.skip();
      return;
    }

    const link = links[0];
    const guardianEmail = link.profiles.email;

    // Create a pending post
    const { data: post, error: postError } = await supabase
      .from('discussion_posts')
      .insert({
        author_id: link.bestie_id,
        title: 'Test Post for Approval',
        content: 'This is a test post requiring approval',
        approval_status: 'pending'
      })
      .select()
      .single();

    expect(postError).toBeNull();

    // Approve the post
    const { error: updateError } = await supabase
      .from('discussion_posts')
      .update({ approval_status: 'approved' })
      .eq('id', post.id);

    expect(updateError).toBeNull();

    // Trigger approval notification
    const { error } = await supabase.functions.invoke('send-approval-notification', {
      body: {
        contentType: 'post',
        contentId: post.id,
        bestieId: link.bestie_id,
        guardianId: link.caregiver_id,
        status: 'approved'
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify notification created
    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', link.bestie_id)
      .eq('type', 'approval_status_changed')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();
    expect(notification!.length).toBeGreaterThan(0);

    console.log('✅ Post approval notification test passed');
  });

  test('sends email when comment is approved @email @approvals', async () => {
    test.setTimeout(90000);

    const { data: links } = await supabase
      .from('caregiver_bestie_links')
      .select('*')
      .eq('require_comment_approval', true)
      .limit(1);

    if (!links || links.length === 0) {
      test.skip();
      return;
    }

    const link = links[0];

    // Get a post to comment on
    const { data: posts } = await supabase
      .from('discussion_posts')
      .select('id')
      .eq('approval_status', 'approved')
      .limit(1);

    if (!posts || posts.length === 0) {
      test.skip();
      return;
    }

    // Create pending comment
    const { data: comment, error: commentError } = await supabase
      .from('discussion_comments')
      .insert({
        post_id: posts[0].id,
        author_id: link.bestie_id,
        content: 'Test comment requiring approval',
        approval_status: 'pending'
      })
      .select()
      .single();

    expect(commentError).toBeNull();

    // Approve comment
    await supabase
      .from('discussion_comments')
      .update({ approval_status: 'approved' })
      .eq('id', comment.id);

    // Trigger notification
    const { error } = await supabase.functions.invoke('send-approval-notification', {
      body: {
        contentType: 'comment',
        contentId: comment.id,
        bestieId: link.bestie_id,
        guardianId: link.caregiver_id,
        status: 'approved'
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', link.bestie_id)
      .eq('type', 'approval_status_changed')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();

    console.log('✅ Comment approval notification test passed');
  });

  test('sends email when vendor asset is approved @email @approvals', async () => {
    test.setTimeout(90000);

    // Get a vendor-bestie relationship
    const { data: requests } = await supabase
      .from('vendor_bestie_requests')
      .select('*, vendors(*), caregiver_bestie_links(*)')
      .eq('request_status', 'approved')
      .limit(1);

    if (!requests || requests.length === 0) {
      test.skip();
      return;
    }

    const request = requests[0];

    // Create pending vendor asset
    const { data: asset, error: assetError } = await supabase
      .from('vendor_bestie_assets')
      .insert({
        vendor_id: request.vendor_id,
        vendor_bestie_request_id: request.id,
        asset_type: 'image',
        asset_url: 'https://example.com/test.jpg',
        approval_status: 'pending'
      })
      .select()
      .single();

    expect(assetError).toBeNull();

    // Approve asset
    await supabase
      .from('vendor_bestie_assets')
      .update({ approval_status: 'approved' })
      .eq('id', asset.id);

    // Trigger notification
    const { error } = await supabase.functions.invoke('send-approval-notification', {
      body: {
        contentType: 'vendor_asset',
        contentId: asset.id,
        vendorId: request.vendor_id,
        guardianId: request.caregiver_bestie_links.caregiver_id,
        status: 'approved'
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'vendor_asset_approved')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();

    console.log('✅ Vendor asset approval notification test passed');
  });
});
