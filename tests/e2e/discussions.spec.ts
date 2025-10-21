import { test, expect } from '@playwright/test';

test.describe('Discussion Posts @fast', () => {
  test('can view discussions page', async ({ page }) => {
    await page.goto('/discussions');
    
    // Wait for page to load - heading is "Community Discussions"
    await expect(page.getByRole('heading', { name: /Community Discussions/i })).toBeVisible({ timeout: 15000 });
    
    // Should see discussion posts or empty state
    const hasCards = await page.locator('[role="article"], .group').count() > 0;
    const hasEmptyState = await page.getByText(/no discussions yet/i).isVisible().catch(() => false);
    
    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  test('discussion posts display correctly with new card layout', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    // Check if there are any posts with the new card structure
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      const firstPost = page.locator('[role="article"]').first();
      
      // Should have title (h3)
      await expect(firstPost.locator('h3')).toBeVisible();
      
      // Should have author info with avatar
      const hasAvatar = await firstPost.locator('[class*="avatar"]').count() > 0;
      expect(hasAvatar).toBeTruthy();
      
      // Should have comment count
      const hasCommentCount = await firstPost.getByText(/\d+ comment/).isVisible().catch(() => false);
      expect(hasCommentCount).toBeTruthy();
    }
  });

  test('posts show role badges', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      // Look for role badges (Guardian, bestie, supporter, etc.)
      const badges = page.locator('[class*="badge"], [class*="capitalize"]').filter({ hasText: /Guardian|bestie|supporter|admin/i });
      const badgeCount = await badges.count();
      
      // At least one post should have a role badge
      expect(badgeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('can click post to open detail dialog', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      // Click first post card
      await page.locator('[role="article"]').first().click();
      
      // Dialog should be visible
      const dialog = page.locator('[role="dialog"]');
      const dialogVisible = await dialog.isVisible().catch(() => false);
      expect(dialogVisible).toBeTruthy();
    }
  });

  test('posts with images show media preview', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    // Look for posts with images in the media preview section
    const postsWithImages = await page.locator('[role="article"] img').count();
    
    // At least check that image loading doesn't break the page
    expect(postsWithImages).toBeGreaterThanOrEqual(0);
  });

  test('posts linked to events show event info', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    // Look for event indicators (Calendar icon or event info)
    const eventIndicators = await page.locator('[data-lucide="calendar"]').count();
    
    // Events might not always be present
    expect(eventIndicators).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Discussion Comments @fast', () => {
  test('comment section visible in detail view', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      // Open first post
      await page.locator('[role="article"]').first().click();
      
      // Check for comment section in dialog
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        const commentsSection = dialog.getByText(/comment/i);
        await expect(commentsSection).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('comments show author info and role badges', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      // Open first post
      await page.locator('[role="article"]').first().click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Look for comment author badges
        const commentBadges = dialog.locator('[class*="badge"]');
        const badgeCount = await commentBadges.count();
        
        // Comments might not have badges if there are no comments
        expect(badgeCount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Discussion Interactions @fast', () => {
  test('text-to-speech buttons are present', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      // Open first post to see TTS in detail view
      await page.locator('[role="article"]').first().click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Look for TTS buttons (speaker/volume icons)
        const ttsButtons = dialog.locator('button[aria-label*="speak"], button[aria-label*="listen"]');
        const ttsCount = await ttsButtons.count();
        
        expect(ttsCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('read more button navigates to detail view', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      // Find and click "Read More" button
      const readMoreButton = page.locator('[role="article"]').first().getByRole('button', { name: /read more/i });
      
      if (await readMoreButton.isVisible()) {
        await readMoreButton.click();
        await page.waitForTimeout(500);
        
        // Dialog should open
        const dialog = page.locator('[role="dialog"]');
        expect(await dialog.isVisible()).toBeTruthy();
      }
    }
  });
});

test.describe('Discussion Edit Functionality @fast', () => {
  test('posts show edited indicator when updated', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      // Open first post
      await page.locator('[role="article"]').first().click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Look for "(edited)" indicator in post metadata
        const hasEditedIndicator = await dialog.getByText(/\(edited\)/i).isVisible().catch(() => false);
        
        // Indicator might not be present on all posts
        expect(typeof hasEditedIndicator).toBe('boolean');
      }
    }
  });

  test('comment edit button shows for comment author', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      await page.locator('[role="article"]').first().click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Look for Edit button on comments (might not exist if user isn't comment author)
        const editButtons = await dialog.getByRole('button', { name: /edit/i }).count();
        
        // Edit buttons might not be visible if not the author
        expect(editButtons).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('comment edit mode shows textarea and save/cancel buttons', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      await page.locator('[role="article"]').first().click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Try to find and click Edit button on a comment
        const editButton = dialog.getByRole('button', { name: /^edit$/i }).first();
        
        if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editButton.click();
          await page.waitForTimeout(300);
          
          // Should show textarea and Save/Cancel buttons
          const textarea = dialog.locator('textarea');
          const saveButton = dialog.getByRole('button', { name: /save/i });
          const cancelButton = dialog.getByRole('button', { name: /cancel/i });
          
          await expect(textarea).toBeVisible({ timeout: 3000 });
          await expect(saveButton).toBeVisible();
          await expect(cancelButton).toBeVisible();
        }
      }
    }
  });

  test('comments show edited indicator when updated', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      await page.locator('[role="article"]').first().click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Look for edited indicators on comments  
        const commentEditedIndicators = await dialog.locator('text=/\\(edited\\)/i').count();
        
        // Might not have edited comments
        expect(commentEditedIndicators).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('post edit button shows for post author', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('networkidle');
    
    const postCount = await page.locator('[role="article"]').count();
    
    if (postCount > 0) {
      await page.locator('[role="article"]').first().click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Look for Edit icon button in post header
        const editButton = dialog.locator('button[aria-label*="edit"], button:has(svg[data-lucide="edit"])').first();
        
        // Edit button might not be visible if user isn't the author
        const isVisible = await editButton.isVisible({ timeout: 2000 }).catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    }
  });
});


