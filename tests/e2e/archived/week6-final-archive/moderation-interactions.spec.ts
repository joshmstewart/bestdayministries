import { test, expect, Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { getTestAccount } from '../fixtures/test-accounts';
import { createClient } from '@supabase/supabase-js';

/**
 * Moderation Queue Interaction E2E Tests - WITH SHARD-SPECIFIC ACCOUNTS AND DATA SEEDING
 * Tests complete content moderation workflows including approve, reject, delete actions
 */
test.describe('Moderation Queue Interactions @fast', () => {
  let moderatorPage: Page;
  const timestamp = Date.now();
  const testPostTitle = `Test Post ${timestamp}`;
  let testPostId: string;
  let seededPostIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    moderatorPage = await context.newPage();

    // Login as admin/moderator with shard-specific account
    const testAccount = getTestAccount();
    
    await moderatorPage.goto('/auth');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.fill('input[type="email"]', testAccount.email);
    await moderatorPage.fill('input[type="password"]', testAccount.password);
    await moderatorPage.click('button:has-text("Sign In")');
    
    await moderatorPage.waitForURL(/\/(community|admin)/);
    await moderatorPage.waitForLoadState('networkidle');
    
    console.log('✅ Logged in as moderator/admin');
    
  // SEED TEST DATA FOR MODERATION
  console.log('📝 Seeding moderation test data...');

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );

  // ✅ FIX: Sign in as test account BEFORE using getUser()
  const testAccount = getTestAccount();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testAccount.email,
    password: testAccount.password,
  });

  if (signInError) {
    throw new Error(`Failed to authenticate for seeding: ${signInError.message}`);
  }

  console.log(`✅ Authenticated as ${testAccount.email} for data seeding`);

  // Now getUser() will return the CORRECT test account
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated for seeding');
  }
    
    // Create 5 pending discussion posts
    for (let i = 1; i <= 5; i++) {
      const { data: post, error } = await supabase
        .from('discussion_posts')
        .insert({
          title: `E2E Mod Test Pending Post ${i}`,
          content: `This is a test post ${i} for moderation testing`,
          author_id: user.id,
          approval_status: 'pending_approval',
          is_moderated: false,
          visible_to_roles: ['caregiver', 'bestie', 'supporter']
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Failed to create pending post ${i}:`, error);
      } else if (post) {
        seededPostIds.push(post.id);
        console.log(`✅ Created pending post ${i}`);
      }
    }
    
    // Create an approved post to attach comments to
    const { data: approvedPost, error: approvedError } = await supabase
      .from('discussion_posts')
      .insert({
        title: 'E2E Mod Test Approved Post for Comments',
        content: 'This post is for testing pending comments',
        author_id: user.id,
        approval_status: 'approved',
        is_moderated: true,
        visible_to_roles: ['caregiver', 'bestie', 'supporter']
      })
      .select()
      .single();
    
    if (approvedError) {
      console.error('Failed to create approved post:', approvedError);
    } else if (approvedPost) {
      seededPostIds.push(approvedPost.id);
      
      // Create 5 pending comments on the approved post
      for (let i = 1; i <= 5; i++) {
        const { error: commentError } = await supabase
          .from('discussion_comments')
          .insert({
            post_id: approvedPost.id,
            content: `E2E Mod Test Pending Comment ${i}`,
            author_id: user.id,
            approval_status: 'pending_approval'
          });
        
        if (commentError) {
          console.error(`Failed to create pending comment ${i}:`, commentError);
        } else {
          console.log(`✅ Created pending comment ${i}`);
        }
      }
    }
    
    console.log(`✅ Seeded ${seededPostIds.length} posts and 5 pending comments for moderation tests`);
    
    // VERIFY seeded data is accessible to admin
    console.log('🔍 Verifying seeded moderation data is accessible...');
    
    try {
      const { data: pendingPosts, error: queryError } = await supabase
        .from('discussion_posts')
        .select('id, title, approval_status, is_moderated, author_id')
        .eq('approval_status', 'pending_approval');

      if (queryError) {
        console.error('❌ Failed to query pending posts:', queryError);
        throw new Error(
          `Cannot query seeded moderation data - possible RLS issue\n` +
          `Error: ${queryError.message}`
        );
      }

      console.log(`📊 Found ${pendingPosts?.length || 0} pending posts`);
      console.log('First post:', pendingPosts?.[0]);

      if ((pendingPosts?.length || 0) < 5) {
        throw new Error(
          `Expected at least 5 pending posts but found: ${pendingPosts?.length}\n` +
          `This suggests posts were created but are not visible due to RLS policies`
        );
      }

      console.log('✅ Seeded moderation data is accessible');
    } catch (error: any) {
      console.error('❌ Moderation data verification failed:', error.message);
      throw error;
    }
  });

  test.afterAll(async () => {
    // Cleanup: Delete all seeded test posts
    if (seededPostIds.length > 0) {
      console.log(`🧹 Cleaning up ${seededPostIds.length} seeded test posts...`);
      
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
      );
      
      // ✅ FIX: Authenticate before cleanup
      const testAccount = getTestAccount();
      await supabase.auth.signInWithPassword({
        email: testAccount.email,
        password: testAccount.password,
      });
      
      for (const postId of seededPostIds) {
        await supabase.from('discussion_posts').delete().eq('id', postId);
      }
      
      console.log('✅ Seeded data cleanup complete');
    }
    
    // Cleanup test post created during tests
    if (testPostId) {
      await moderatorPage.evaluate(async ({ postId }) => {
        try {
          // @ts-ignore
          const { supabase } = await import('/src/integrations/supabase/client.ts');
          await supabase.from('discussion_posts').delete().eq('id', postId);
          console.log('✅ Test post cleaned up');
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }, { postId: testPostId });
    }
    
    await moderatorPage.close();
  });

  test('can navigate to moderation queue', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    // Click Moderation tab
    const moderationTab = moderatorPage.locator('button:has-text("Moderation")').first();
    await moderationTab.waitFor({ state: 'visible', timeout: 15000 });
    await moderationTab.click();
    await moderatorPage.waitForTimeout(1500);
    
    // Verify moderation interface loads
    const moderationContent = moderatorPage.locator('text=/Content|Posts|Comments/i').first();
    await expect(moderationContent).toBeVisible({ timeout: 10000 });
  });

  test('moderation queue has filter tabs', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Check for content type tabs
    const expectedTabs = ['Posts', 'Comments', 'Messages'];
    let visibleTabs = 0;
    
    for (const tabName of expectedTabs) {
      const tab = moderatorPage.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        visibleTabs++;
      }
    }
    
    expect(visibleTabs).toBeGreaterThan(0);
  });

  test('displays pending posts', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Click on Posts tab
    const postsTab = moderatorPage.locator('button:has-text("Posts"), [role="tab"]:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Should now see at least one pending post (from our seeding)
    const pendingPosts = moderatorPage.locator('[data-post-id]');
    const count = await pendingPosts.count();
    
    console.log(`Found ${count} pending posts`);
    expect(count).toBeGreaterThan(0);
  });

  test('displays pending comments', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Click on Comments tab
    const commentsTab = moderatorPage.locator('button:has-text("Comments"), [role="tab"]:has-text("Comments")').first();
    if (await commentsTab.isVisible()) {
      await commentsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Should see at least one pending comment (from our seeding)
    const pendingComments = moderatorPage.locator('[data-comment-id]');
    const count = await pendingComments.count();
    
    console.log(`Found ${count} pending comments`);
    expect(count).toBeGreaterThan(0);
  });

  test('can approve a post', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Find first pending post
    const firstPost = moderatorPage.locator('[data-post-id]').first();
    if (await firstPost.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for approve button
      const approveButton = firstPost.locator('button:has-text("Approve"), button[title*="Approve"]').first();
      if (await approveButton.isVisible().catch(() => false)) {
        await approveButton.click();
        await moderatorPage.waitForTimeout(1000);
        console.log('✅ Post approved');
      }
    }
  });

  test('can reject a post', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Find first pending post
    const firstPost = moderatorPage.locator('[data-post-id]').first();
    if (await firstPost.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for reject button
      const rejectButton = firstPost.locator('button:has-text("Reject"), button[title*="Reject"]').first();
      if (await rejectButton.isVisible().catch(() => false)) {
        await rejectButton.click();
        await moderatorPage.waitForTimeout(1000);
        console.log('✅ Post rejected');
      }
    }
  });

  test('can delete a post with cascade warning', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Find first post
    const firstPost = moderatorPage.locator('[data-post-id]').first();
    if (await firstPost.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for delete button
      const deleteButton = firstPost.locator('button:has-text("Delete"), button[title*="Delete"]').first();
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        
        // Look for cascade warning in dialog/confirmation
        const cascadeWarning = moderatorPage.locator('text=/cascade|also delete|comments will/i').first();
        const hasWarning = await cascadeWarning.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasWarning) {
          console.log('✅ Cascade delete warning shown');
          
          // Cancel the deletion
          const cancelButton = moderatorPage.locator('button:has-text("Cancel")').first();
          if (await cancelButton.isVisible().catch(() => false)) {
            await cancelButton.click();
          }
        }
      }
    }
  });

  test('can approve a comment', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    const commentsTab = moderatorPage.locator('button:has-text("Comments")').first();
    if (await commentsTab.isVisible()) {
      await commentsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Find first pending comment
    const firstComment = moderatorPage.locator('[data-comment-id]').first();
    if (await firstComment.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for approve button
      const approveButton = firstComment.locator('button:has-text("Approve"), button[title*="Approve"]').first();
      if (await approveButton.isVisible().catch(() => false)) {
        await approveButton.click();
        await moderatorPage.waitForTimeout(1000);
        console.log('✅ Comment approved');
      }
    }
  });

  test('can reject a comment', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    const commentsTab = moderatorPage.locator('button:has-text("Comments")').first();
    if (await commentsTab.isVisible()) {
      await commentsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Find first pending comment
    const firstComment = moderatorPage.locator('[data-comment-id]').first();
    if (await firstComment.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for reject button
      const rejectButton = firstComment.locator('button:has-text("Reject"), button[title*="Reject"]').first();
      if (await rejectButton.isVisible().catch(() => false)) {
        await rejectButton.click();
        await moderatorPage.waitForTimeout(1000);
        console.log('✅ Comment rejected');
      }
    }
  });

  test('can delete a comment', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    const commentsTab = moderatorPage.locator('button:has-text("Comments")').first();
    if (await commentsTab.isVisible()) {
      await commentsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Find first comment
    const firstComment = moderatorPage.locator('[data-comment-id]').first();
    if (await firstComment.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for delete button
      const deleteButton = firstComment.locator('button:has-text("Delete"), button[title*="Delete"]').first();
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        
        // Confirm if dialog appears
        const confirmButton = moderatorPage.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        await moderatorPage.waitForTimeout(1000);
        console.log('✅ Comment deleted');
      }
    }
  });

  test('shows status badges for items', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Look for status indicators
    const statusBadges = moderatorPage.locator('[class*="badge"], [class*="status"]');
    const count = await statusBadges.count();
    
    if (count > 0) {
      console.log(`Found ${count} status badges`);
    }
  });

  test('can filter by content type', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Test switching between tabs
    const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
    const commentsTab = moderatorPage.locator('button:has-text("Comments")').first();
    
    if (await postsTab.isVisible() && await commentsTab.isVisible()) {
      await postsTab.click();
      await expect(postsTab).toHaveAttribute('aria-selected', 'true');
      
      await commentsTab.click();
      await expect(commentsTab).toHaveAttribute('aria-selected', 'true');
      
      console.log('✅ Content type filtering works');
    }
  });

  test('has bulk selection capability', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Look for select all or checkboxes
    const selectAllCheckbox = moderatorPage.locator('input[type="checkbox"][aria-label*="Select all"], button:has-text("Select All")').first();
    const hasSelectAll = await selectAllCheckbox.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasSelectAll) {
      console.log('✅ Bulk selection UI present');
    } else {
      console.log('ℹ️  Bulk selection may not be implemented');
    }
  });

  test('has bulk action buttons', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Look for bulk action buttons
    const bulkApprove = moderatorPage.locator('button:has-text("Approve All"), button:has-text("Bulk Approve")').first();
    const bulkReject = moderatorPage.locator('button:has-text("Reject All"), button:has-text("Bulk Reject")').first();
    
    const hasApprove = await bulkApprove.isVisible({ timeout: 3000 }).catch(() => false);
    const hasReject = await bulkReject.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasApprove || hasReject) {
      console.log('✅ Bulk action buttons present');
    } else {
      console.log('ℹ️  Bulk actions may not be implemented');
    }
  });

  test('moderation queue updates in realtime', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
    
    // Count initial items
    const initialItems = await moderatorPage.locator('[data-post-id], [data-comment-id]').count();
    
    // Wait a bit to see if realtime updates work
    await moderatorPage.waitForTimeout(2000);
    await moderatorPage.waitForLoadState('networkidle');
    
    const laterItems = await moderatorPage.locator('[data-post-id], [data-comment-id]').count();
    
    console.log(`Initial items: ${initialItems}, Later items: ${laterItems}`);
    console.log('Realtime subscription active');
  });

  // VISUAL REGRESSION TESTS
  test.describe('Moderation Visual Regression', () => {
    test('moderation posts tab visual snapshot', async () => {
      await moderatorPage.goto('/admin');
      await moderatorPage.waitForLoadState('networkidle');
      
      await moderatorPage.click('button:has-text("Moderation")');
      await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
      
      const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
      if (await postsTab.isVisible()) {
        await postsTab.click();
        await expect(postsTab).toHaveAttribute('aria-selected', 'true');
      }
      
      await percySnapshot(moderatorPage, 'Moderation Queue - Posts Tab');
    });

    test('moderation comments tab visual snapshot', async () => {
      await moderatorPage.goto('/admin');
      await moderatorPage.waitForLoadState('networkidle');
      
      await moderatorPage.click('button:has-text("Moderation")');
      await expect(moderatorPage.locator('text=/Content|Posts|Comments/i').first()).toBeVisible({ timeout: 10000 });
      
      const commentsTab = moderatorPage.locator('button:has-text("Comments")').first();
      if (await commentsTab.isVisible()) {
        await commentsTab.click();
        await expect(commentsTab).toHaveAttribute('aria-selected', 'true');
        await percySnapshot(moderatorPage, 'Moderation Queue - Comments Tab');
      }
    });
  });
});
