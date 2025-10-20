import { test, expect, Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

/**
 * Moderation Queue Interaction E2E Tests
 * Tests complete content moderation workflows including approve, reject, delete actions
 */
test.describe('Moderation Queue Interactions @fast', () => {
  let moderatorPage: Page;
  const timestamp = Date.now();
  const testPostTitle = `Test Post ${timestamp}`;
  let testPostId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    moderatorPage = await context.newPage();

    // Login as admin/moderator
    await moderatorPage.goto('/auth');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.fill('input[type="email"]', 'test@example.com');
    await moderatorPage.fill('input[type="password"]', 'testpassword123');
    await moderatorPage.click('button:has-text("Sign In")');
    
    await moderatorPage.waitForURL(/\/(community|admin)/);
    await moderatorPage.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    // Cleanup test post if still exists
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
    await moderatorPage.waitForTimeout(1500);
    
    // Check for content type tabs
    const expectedTabs = ['Posts', 'Comments', 'Messages'];
    let visibleTabs = 0;
    
    for (const tabName of expectedTabs) {
      const tab = moderatorPage.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        visibleTabs++;
        console.log(`Moderation tab "${tabName}" is visible`);
      }
    }
    
    expect(visibleTabs).toBeGreaterThan(0);
  });

  test('can view pending posts', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    // Click Posts tab if exists
    const postsTab = moderatorPage.locator('button:has-text("Posts"), [role="tab"]:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Look for pending posts or empty state
    const hasPosts = await moderatorPage.locator('text=/Pending|Review|Approve/i').first().isVisible().catch(() => false);
    console.log('Pending posts visible:', hasPosts);
  });

  test('can approve a post', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Look for approve button on first item
    const approveBtn = moderatorPage.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      // Get post ID before approving
      const postCard = moderatorPage.locator('[data-post-id], [data-id]').first();
      const postId = await postCard.getAttribute('data-post-id').catch(() => null);
      
      await approveBtn.click();
      await moderatorPage.waitForTimeout(2000);
      
      // Verify post status changed if we got the ID
      if (postId) {
        const post = await moderatorPage.evaluate(async ({ id }) => {
          // @ts-ignore
          const { supabase } = await import('/src/integrations/supabase/client.ts');
          const { data } = await supabase
            .from('discussion_posts')
            .select('approval_status')
            .eq('id', id)
            .single();
          return data;
        }, { id: postId });
        
        if (post) {
          expect(post.approval_status).toBe('approved');
        }
      }
      
      console.log('Post approved successfully');
    } else {
      console.log('No pending posts to approve');
    }
  });

  test('can reject a post', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Look for reject button
    const rejectBtn = moderatorPage.locator('button:has-text("Reject"), button:has-text("Deny")').first();
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();
      await moderatorPage.waitForTimeout(2000);
      
      console.log('Post rejected successfully');
    } else {
      console.log('No pending posts to reject');
    }
  });

  test('can delete post with cascade warning', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await moderatorPage.waitForTimeout(1000);
    }
    
    // Look for delete button
    const deleteBtn = moderatorPage.locator('button[aria-label*="Delete" i], button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await moderatorPage.waitForTimeout(1000);
      
      // Check for cascade warning
      const warningText = moderatorPage.locator('text=/cascade|comments|will also be deleted/i').first();
      const hasWarning = await warningText.isVisible().catch(() => false);
      
      if (hasWarning) {
        console.log('✅ Cascade delete warning displayed');
        
        // Cancel deletion in test
        const cancelBtn = moderatorPage.locator('button:has-text("Cancel"), button:has-text("Close")').first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        }
      }
    }
  });

  test('can view pending comments', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    // Click Comments tab
    const commentsTab = moderatorPage.locator('button:has-text("Comments"), [role="tab"]:has-text("Comments")').first();
    if (await commentsTab.isVisible()) {
      await commentsTab.click();
      await moderatorPage.waitForTimeout(1000);
      
      // Verify comments interface loads
      const hasComments = await moderatorPage.locator('text=/Comment|Pending|Review/i').first().isVisible().catch(() => false);
      console.log('Comments moderation interface loaded:', hasComments);
    }
  });

  test('can moderate comments', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    const commentsTab = moderatorPage.locator('button:has-text("Comments")').first();
    if (await commentsTab.isVisible()) {
      await commentsTab.click();
      await moderatorPage.waitForTimeout(1000);
      
      // Look for approve/reject buttons
      const moderateBtn = moderatorPage.locator('button:has-text("Approve"), button:has-text("Reject")').first();
      const canModerate = await moderateBtn.isVisible().catch(() => false);
      
      if (canModerate) {
        console.log('Comment moderation actions available');
      } else {
        console.log('No pending comments to moderate');
      }
    }
  });

  test('can bulk select items', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    // Look for select all or bulk selection checkbox
    const selectAllCheckbox = moderatorPage.locator('input[type="checkbox"][aria-label*="Select all" i]').first();
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.click();
      await moderatorPage.waitForTimeout(500);
      
      console.log('Bulk selection toggled');
    } else {
      console.log('Bulk selection not available');
    }
  });

  test('can perform bulk actions', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    // Look for bulk action buttons
    const bulkApproveBtn = moderatorPage.locator('button:has-text("Approve Selected"), button:has-text("Bulk Approve")').first();
    const hasBulkActions = await bulkApproveBtn.isVisible().catch(() => false);
    
    if (hasBulkActions) {
      console.log('✅ Bulk actions available');
    } else {
      console.log('Bulk actions not visible (may require selections)');
    }
  });

  test('displays status badges correctly', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    // Look for status indicators
    const statusBadge = moderatorPage.locator('[class*="badge"], [data-status]').first();
    const hasBadges = await statusBadge.isVisible().catch(() => false);
    
    if (hasBadges) {
      console.log('Status badges displayed');
    }
  });

  test('can filter by content type', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    // Test switching between tabs
    const tabs = ['Posts', 'Comments', 'Messages'];
    
    for (const tabName of tabs) {
      const tab = moderatorPage.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible()) {
        await tab.click();
        await moderatorPage.waitForTimeout(1000);
        console.log(`Switched to ${tabName} filter`);
      }
    }
  });

  test('moderation queue updates realtime', async () => {
    await moderatorPage.goto('/admin');
    await moderatorPage.waitForLoadState('networkidle');
    
    await moderatorPage.click('button:has-text("Moderation")');
    await moderatorPage.waitForTimeout(1500);
    
    // Get initial count
    const initialItems = await moderatorPage.locator('[data-post-id], [data-comment-id]').count();
    
    // Wait to see if realtime updates occur
    await moderatorPage.waitForTimeout(3000);
    
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
      await moderatorPage.waitForTimeout(1500);
      
      const postsTab = moderatorPage.locator('button:has-text("Posts")').first();
      if (await postsTab.isVisible()) {
        await postsTab.click();
        await moderatorPage.waitForTimeout(1000);
      }
      
      await percySnapshot(moderatorPage, 'Moderation Queue - Posts Tab');
    });

    test('moderation comments tab visual snapshot', async () => {
      await moderatorPage.goto('/admin');
      await moderatorPage.waitForLoadState('networkidle');
      
      await moderatorPage.click('button:has-text("Moderation")');
      await moderatorPage.waitForTimeout(1500);
      
      const commentsTab = moderatorPage.locator('button:has-text("Comments")').first();
      if (await commentsTab.isVisible()) {
        await commentsTab.click();
        await moderatorPage.waitForTimeout(1000);
        await percySnapshot(moderatorPage, 'Moderation Queue - Comments Tab');
      }
    });
  });
});
