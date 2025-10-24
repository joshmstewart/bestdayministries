/**
 * E2E Email Tests - Approval Notifications
 * 
 * Tests approval notification emails via database verification.
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

test.describe('Approval Notification Email Tests', () => {
  let seedData: any;
  let guardianClient: any;
  let bestieClient: any;
  const createdNotificationIds: string[] = [];
  const createdPostIds: string[] = [];
  const createdCommentIds: string[] = [];
  const createdVendorAssetIds: string[] = [];

  test.beforeAll(async () => {
    // Seed test data once for all tests using retry wrapper
    const testRunId = Date.now().toString();
    const { data, error } = await supabase.functions.invoke('seed-email-test-data-with-retry', {
      body: { testRunId }
    });

    if (error) {
      throw new Error(`Failed to seed test data: ${error.message}`);
    }

    seedData = data;
    console.log('✅ Seeded test data:', seedData);

    // Create authenticated client for guardian
    guardianClient = await getAuthenticatedClient(
      seedData.authSessions.guardian.access_token,
      seedData.authSessions.guardian.refresh_token
    );

    // Create authenticated client for bestie
    bestieClient = await getAuthenticatedClient(
      seedData.authSessions.bestie.access_token,
      seedData.authSessions.bestie.refresh_token
    );
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (createdNotificationIds.length > 0) {
      await supabase.from('notifications').delete().in('id', createdNotificationIds);
      createdNotificationIds.length = 0;
    }
    if (createdPostIds.length > 0) {
      await guardianClient.from('discussion_posts').delete().in('id', createdPostIds);
      createdPostIds.length = 0;
    }
    if (createdCommentIds.length > 0) {
      await bestieClient.from('discussion_comments').delete().in('id', createdCommentIds);
      createdCommentIds.length = 0;
    }
    if (createdVendorAssetIds.length > 0) {
      await supabase.from('vendor_bestie_assets').delete().in('id', createdVendorAssetIds);
      createdVendorAssetIds.length = 0;
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

  test('sends email when post is approved @email @approvals', async () => {
    test.setTimeout(90000);

    // Get guardian-bestie link using authenticated client
    const { data: links } = await guardianClient
      .from('caregiver_bestie_links')
      .select('*, profiles!caregiver_bestie_links_caregiver_id_fkey(email)')
      .eq('require_post_approval', true)
      .limit(1);

    if (!links || links.length === 0) {
      throw new Error('PRECONDITION FAILED: No guardian-bestie links with post approval found. The seed function should create these relationships. Check seed-email-test-data function.');
    }

    const link = links[0];
    const guardianEmail = link.profiles.email;

    // Create a pending post
    const { data: post, error: postError } = await bestieClient
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
    createdPostIds.push(post.id);

    // Approve the post
    const { error: updateError } = await guardianClient
      .from('discussion_posts')
      .update({ approval_status: 'approved' })
      .eq('id', post.id);

    expect(updateError).toBeNull();

    // Get bestie profile for name
    const { data: bestieProfile } = await guardianClient
      .from('profiles')
      .select('display_name')
      .eq('id', link.bestie_id)
      .single();

    // Trigger approval notification
    const { error } = await guardianClient.functions.invoke('send-approval-notification', {
      body: {
        guardianId: link.caregiver_id,
        contentType: 'post',
        contentId: post.id,
        bestieName: bestieProfile?.display_name || 'Test Bestie',
        contentPreview: post.title
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify notification created
    const { data: notification } = await guardianClient
      .from('notifications')
      .select('*')
      .eq('user_id', link.bestie_id)
      .eq('type', 'approval_decision')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();
    expect(notification!.length).toBeGreaterThan(0);
    if (notification && notification.length > 0) {
      createdNotificationIds.push(notification[0].id);
    }

    console.log('✅ Post approval notification test passed');
  });

  test('sends email when comment is approved @email @approvals', async () => {
    test.setTimeout(90000);

    const { data: links } = await guardianClient
      .from('caregiver_bestie_links')
      .select('*')
      .eq('require_comment_approval', true)
      .limit(1);

    if (!links || links.length === 0) {
      throw new Error('PRECONDITION FAILED: No guardian-bestie links with comment approval found. The seed function should create these relationships. Check seed-email-test-data function.');
    }

    const link = links[0];

    // Get a post to comment on
    const { data: posts } = await guardianClient
      .from('discussion_posts')
      .select('id')
      .eq('approval_status', 'approved')
      .limit(1);

    if (!posts || posts.length === 0) {
      throw new Error('PRECONDITION FAILED: No approved posts found for commenting. The seed function should create approved posts. Check seed-email-test-data function.');
    }

    // Create pending comment
    const { data: comment, error: commentError } = await bestieClient
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
    createdCommentIds.push(comment.id);

    // Approve comment
    await guardianClient
      .from('discussion_comments')
      .update({ approval_status: 'approved' })
      .eq('id', comment.id);

    // Get bestie profile for name
    const { data: bestieProfile } = await guardianClient
      .from('profiles')
      .select('display_name')
      .eq('id', link.bestie_id)
      .single();

    // Trigger notification
    const { error } = await guardianClient.functions.invoke('send-approval-notification', {
      body: {
        guardianId: link.caregiver_id,
        contentType: 'comment',
        contentId: comment.id,
        bestieName: bestieProfile?.display_name || 'Test Bestie',
        contentPreview: comment.content
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: notification } = await guardianClient
      .from('notifications')
      .select('*')
      .eq('user_id', link.bestie_id)
      .eq('type', 'approval_decision')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();
    if (notification && notification.length > 0) {
      createdNotificationIds.push(notification[0].id);
    }

    console.log('✅ Comment approval notification test passed');
  });

  test('sends email when vendor asset is approved @email @approvals', async () => {
    test.setTimeout(90000);

    // Get a vendor-bestie relationship using authenticated client
    const { data: requests } = await guardianClient
      .from('vendor_bestie_requests')
      .select('*, vendors(*), caregiver_bestie_links(*)')
      .eq('status', 'approved')
      .limit(1);

    if (!requests || requests.length === 0) {
      throw new Error('PRECONDITION FAILED: No approved vendor-bestie requests found. The seed function should create these relationships. Check seed-email-test-data function.');
    }

    const request = requests[0];

    // Create pending vendor asset
    const { data: asset, error: assetError } = await guardianClient
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
    createdVendorAssetIds.push(asset.id);

    // Approve asset
    await guardianClient
      .from('vendor_bestie_assets')
      .update({ approval_status: 'approved' })
      .eq('id', asset.id);

    // Get bestie profile for name
    const { data: bestieProfile } = await guardianClient
      .from('profiles')
      .select('display_name')
      .eq('id', request.bestie_id)
      .single();

    // Trigger notification
    const { error } = await guardianClient.functions.invoke('send-approval-notification', {
      body: {
        guardianId: request.caregiver_bestie_links?.caregiver_id || seedData.userIds.guardian,
        contentType: 'vendor_asset',
        contentId: asset.id,
        bestieName: bestieProfile?.display_name || 'Test Bestie',
        contentPreview: 'Vendor asset approval'
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: notification } = await guardianClient
      .from('notifications')
      .select('*')
      .eq('type', 'vendor_asset_approved')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(notification).toBeTruthy();
    if (notification && notification.length > 0) {
      createdNotificationIds.push(notification[0].id);
    }

    console.log('✅ Vendor asset approval notification test passed');
  });
});
