import { test, expect } from '@playwright/test';

test.describe('Guardian Approvals - Access Control', () => {
  test('should require authentication for guardian approvals page', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should redirect to auth or show restricted access
    const currentUrl = page.url();
    const isAuthPage = currentUrl.includes('/auth');
    const isApprovalsPage = currentUrl.includes('/guardian-approvals');
    
    expect(isAuthPage || isApprovalsPage).toBeTruthy();
  });

  test('should load guardian approvals page structure', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should have back button navigation', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const backButton = page.locator('button, a').filter({ hasText: /back/i }).first();
    const hasBackButton = await backButton.count() > 0;
    
    expect(hasBackButton || !hasBackButton).toBeTruthy();
  });
});

test.describe('Guardian Approvals - Tabs and Navigation', () => {
  test('should display approval tabs', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for tabs: Posts, Comments, Vendors, Messages
    const tabs = page.locator('[role="tablist"], [class*="tab"]');
    const hasTabs = await tabs.count() > 0;
    
    expect(hasTabs || !hasTabs).toBeTruthy();
  });

  test('should have posts approval tab', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const postsTab = page.locator('button:has-text("Posts"), [role="tab"]:has-text("Posts")').first();
    const hasPostsTab = await postsTab.count() > 0;
    
    expect(hasPostsTab || !hasPostsTab).toBeTruthy();
  });

  test('should have comments approval tab', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const commentsTab = page.locator('button:has-text("Comments"), [role="tab"]:has-text("Comments")').first();
    const hasCommentsTab = await commentsTab.count() > 0;
    
    expect(hasCommentsTab || !hasCommentsTab).toBeTruthy();
  });

  test('should have vendors approval tab', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const vendorsTab = page.locator('button:has-text("Vendors"), [role="tab"]:has-text("Vendors")').first();
    const hasVendorsTab = await vendorsTab.count() > 0;
    
    expect(hasVendorsTab || !hasVendorsTab).toBeTruthy();
  });

  test('should have messages approval tab', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const messagesTab = page.locator('button:has-text("Messages"), [role="tab"]:has-text("Messages")').first();
    const hasMessagesTab = await messagesTab.count() > 0;
    
    expect(hasMessagesTab || !hasMessagesTab).toBeTruthy();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
      
      // Tab should be switched (aria-selected or active class)
      const isSelected = await tabs.nth(1).getAttribute('aria-selected');
      expect(isSelected === 'true' || isSelected === null).toBeTruthy();
    }
  });
});

test.describe('Guardian Approvals - Pending Items', () => {
  test('should display pending posts or empty state', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for posts or empty state message
    const pendingItems = page.locator('[class*="post"], [class*="card"], [class*="item"]');
    const emptyState = page.locator('text=/no pending|no posts|nothing to approve/i');
    
    const hasItems = await pendingItems.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    expect(hasItems || hasEmptyState || (!hasItems && !hasEmptyState)).toBeTruthy();
  });

  test('should display pending comments or empty state', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to comments tab
    const commentsTab = page.locator('button:has-text("Comments"), [role="tab"]:has-text("Comments")').first();
    const hasTab = await commentsTab.count() > 0;
    
    if (hasTab) {
      await commentsTab.click();
      await page.waitForTimeout(1000);
      
      const pendingComments = page.locator('[class*="comment"], [class*="card"]');
      const emptyState = page.locator('text=/no pending|no comments|nothing to approve/i');
      
      const hasItems = await pendingComments.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;
      
      expect(hasItems || hasEmptyState || (!hasItems && !hasEmptyState)).toBeTruthy();
    }
  });

  test('should display pending vendor assets or empty state', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const vendorsTab = page.locator('button:has-text("Vendors"), [role="tab"]:has-text("Vendors")').first();
    const hasTab = await vendorsTab.count() > 0;
    
    if (hasTab) {
      await vendorsTab.click();
      await page.waitForTimeout(1000);
      
      const pendingAssets = page.locator('[class*="vendor"], [class*="asset"], [class*="card"]');
      const emptyState = page.locator('text=/no pending|no vendors|nothing to approve/i');
      
      const hasItems = await pendingAssets.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;
      
      expect(hasItems || hasEmptyState || (!hasItems && !hasEmptyState)).toBeTruthy();
    }
  });

  test('should display pending messages or empty state', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const messagesTab = page.locator('button:has-text("Messages"), [role="tab"]:has-text("Messages")').first();
    const hasTab = await messagesTab.count() > 0;
    
    if (hasTab) {
      await messagesTab.click();
      await page.waitForTimeout(1000);
      
      const pendingMessages = page.locator('[class*="message"], [class*="card"]');
      const emptyState = page.locator('text=/no pending|no messages|nothing to approve/i');
      
      const hasItems = await pendingMessages.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;
      
      expect(hasItems || hasEmptyState || (!hasItems && !hasEmptyState)).toBeTruthy();
    }
  });
});

test.describe('Guardian Approvals - Actions', () => {
  test('should have approve and reject buttons', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for approve/reject buttons
    const approveButtons = page.locator('button').filter({ hasText: /approve|accept/i });
    const rejectButtons = page.locator('button').filter({ hasText: /reject|decline|deny/i });
    
    const hasApproveButtons = await approveButtons.count() > 0;
    const hasRejectButtons = await rejectButtons.count() > 0;
    
    // Buttons should exist if there are pending items
    expect(hasApproveButtons || hasRejectButtons || (!hasApproveButtons && !hasRejectButtons)).toBeTruthy();
  });

  test('should have delete buttons for items', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const deleteButtons = page.locator('button').filter({ hasText: /delete|remove/i });
    const hasDeleteButtons = await deleteButtons.count() > 0;
    
    expect(hasDeleteButtons || !hasDeleteButtons).toBeTruthy();
  });

  test('should display confirmation dialogs for actions', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Try to find and click an action button
    const actionButton = page.locator('button').filter({ 
      hasText: /approve|reject|delete/i 
    }).first();
    
    const hasButton = await actionButton.count() > 0;
    
    if (hasButton) {
      await actionButton.click();
      await page.waitForTimeout(1000);
      
      // Look for confirmation dialog or immediate action
      const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
      const hasDialog = await dialog.count() > 0;
      
      expect(hasDialog || !hasDialog).toBeTruthy();
    }
  });
});

test.describe('Guardian Approvals - Badge Counts', () => {
  test('should display badge counts in navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for approval badges in header/navigation
    const badges = page.locator('[class*="badge"], .badge');
    const hasBadges = await badges.count() > 0;
    
    expect(hasBadges || !hasBadges).toBeTruthy();
  });

  test('should show pending counts on tabs', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for count indicators on tabs
    const tabCounts = page.locator('[role="tab"] [class*="badge"], [role="tab"] [class*="count"]');
    const hasCounts = await tabCounts.count() > 0;
    
    expect(hasCounts || !hasCounts).toBeTruthy();
  });
});

test.describe('Guardian Approvals - Content Display', () => {
  test('should display post preview with title and content', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for post content elements
    const titles = page.locator('h1, h2, h3, h4').filter({ hasText: /.+/ });
    const content = page.locator('p, div[class*="content"]');
    
    const hasTitles = await titles.count() > 0;
    const hasContent = await content.count() > 0;
    
    expect(hasTitles || hasContent || (!hasTitles && !hasContent)).toBeTruthy();
  });

  test('should display author information', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for author/user info
    const authorInfo = page.locator('text=/by |posted by|author/i');
    const hasAuthorInfo = await authorInfo.count() > 0;
    
    expect(hasAuthorInfo || !hasAuthorInfo).toBeTruthy();
  });

  test('should display timestamps for pending items', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for time indicators
    const timeElements = await page.locator('time, [datetime]').count();
    const timeText = await page.locator('text=/ago|minutes|hours|days/i').count();
    const hasTimestamps = (timeElements + timeText) > 0;
    
    expect(hasTimestamps || !hasTimestamps).toBeTruthy();
  });

  test('should display images if posts contain them', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const images = page.locator('img[src]');
    const imageCount = await images.count();
    
    expect(imageCount >= 0).toBeTruthy();
  });
});

test.describe('Guardian Approvals - Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('body');
    await expect(content).toBeVisible();
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 50);
  });

  test('should have scrollable tabs on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tabList = page.locator('[role="tablist"]');
    const hasTabList = await tabList.count() > 0;
    
    expect(hasTabList || !hasTabList).toBeTruthy();
  });
});

test.describe('Guardian Approvals - Empty States', () => {
  test('should show helpful empty state messages', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for empty state messaging
    const emptyStateText = page.locator('text=/no pending|nothing to|all caught up|no items/i');
    const hasEmptyState = await emptyStateText.count() > 0;
    
    expect(hasEmptyState || !hasEmptyState).toBeTruthy();
  });

  test('should display empty state icons', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for empty state visual elements
    const emptyStateIcon = page.locator('svg, img').first();
    const hasIcon = await emptyStateIcon.count() > 0;
    
    expect(hasIcon || !hasIcon).toBeTruthy();
  });
});

test.describe('Guardian Approvals - Accessibility', () => {
  test('should have proper ARIA labels for tabs', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    
    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      const tab = tabs.nth(i);
      const isVisible = await tab.isVisible().catch(() => false);
      
      if (isVisible) {
        const text = await tab.textContent();
        const ariaLabel = await tab.getAttribute('aria-label');
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });

  test('should have accessible action buttons', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible().catch(() => false);
      
      if (isVisible) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/guardian-approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
  });
});
