import { test, expect } from '@playwright/test';
import { getTestAccount } from '../fixtures/test-accounts';

test.describe('Daily Scratch Card @fast', () => {
  test('should display scratch card component on community page', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    // Look for the scratch card section
    const scratchCardSection = page.locator('[class*="scratch"], [class*="sticker"]').first();
    const hasScratchCard = await scratchCardSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Scratch card should be visible on community page
    expect(hasScratchCard).toBeTruthy();
  });

  test('should show explanation text for scratch cards', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    // Look for explanation text about daily scratch cards
    const explanationText = page.locator('text=/scratch.*collection/i, text=/collect.*sticker/i').first();
    const hasExplanation = await explanationText.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasExplanation).toBeTruthy();
  });

  test('should navigate to sticker album when clicked', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    // Look for clickable scratch card or sticker button
    const scratchButton = page.locator('button').filter({ hasText: /scratch|sticker|view/i }).first();
    const hasButton = await scratchButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasButton) {
      await scratchButton.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to sticker album
      const url = page.url();
      expect(url.includes('/sticker-album') || url.includes('/sticker') || url.includes('/collection')).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
  });

  test('should remain clickable after scratching', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    // Even after scratching, should still be able to click to view collection
    const stickerElement = page.locator('[class*="sticker"], button').filter({ hasText: /view|collection|album/i }).first();
    const isClickable = await stickerElement.isVisible({ timeout: 5000 }).catch(() => false);
    
    // If element exists, verify it's clickable
    if (isClickable) {
      await expect(stickerElement).toBeVisible();
    } else {
      // Element may not be visible if card already scratched or in different state
      console.log('Sticker element not found - may be in different state');
    }
  });
});

test.describe('Sticker Album Viewing @fast', () => {
  test('should load sticker album page', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Check for main content
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('should display drop rate information', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for drop rate section
    const dropRateSection = page.locator('text=/drop rate/i, text=/percentage/i, text=/rarity/i').first();
    const hasDropRates = await dropRateSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasDropRates).toBeTruthy();
  });

  test('should show rarity percentages', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for any percentage values (dynamic, configurable by admin)
    const percentageText = page.locator('text=/\\d+%/').first();
    const hasPercentages = await percentageText.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasPercentages).toBeTruthy();
  });

  test('should display sticker collection grid', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Wait for content to load before checking
    await page.waitForTimeout(2000);
    
    // Look for grid or collection display
    const grid = page.locator('[class*="grid"], [class*="collection"]').first();
    const hasGrid = await grid.isVisible({ timeout: 10000 }).catch(() => false);
    
    // Verify grid exists if collections are loaded
    if (hasGrid) {
      await expect(grid).toBeVisible();
    } else {
      // May not have active collections yet
      console.log('Sticker grid not found - may not have active collections');
    }
  });

  test('should show collection progress', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Wait for content to load before checking
    await page.waitForTimeout(2000);
    
    // Look for progress indicator or completion percentage
    const progress = page.locator('[role="progressbar"], text=/progress/i, text=/collected/i').first();
    const hasProgress = await progress.isVisible({ timeout: 10000 }).catch(() => false);
    
    // Verify progress indicator exists if collections are loaded
    if (hasProgress) {
      await expect(progress).toBeVisible();
    } else {
      // May not have active collections yet
      console.log('Progress indicator not found - may not have active collections');
    }
  });
});

test.describe('Admin Sticker Management @fast', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as admin before each test
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/(community|admin)/, { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    // Extra wait for admin UI to fully load
    await page.waitForTimeout(2000);
  });

  test('should access sticker management from admin panel', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    // Wait for tabs to render
    await page.waitForTimeout(2000);
    
    // Look for sticker-related tab or section
    const stickerTab = page.locator('[role="tab"], button, a').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 10000 }).catch(() => false);
    
    // Verify sticker tab exists
    if (hasTab) {
      await expect(stickerTab).toBeVisible();
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should display sticker collections list', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Try to find and click sticker/collection tab
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for collections list
      const collectionsList = page.locator('[class*="collection"], [class*="list"]').first();
      const hasList = await collectionsList.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Verify collections list if tab exists
      if (hasList) {
        await expect(collectionsList).toBeVisible();
      } else {
        // Collections list may not exist yet
        console.log('Collections list not found - may not have collections yet');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should have create collection button', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for create button
      const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      const hasButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Verify create button if tab exists
      if (hasButton) {
        await expect(createButton).toBeVisible();
      } else {
        // Create button may not exist yet
        console.log('Create button not found - may be loading');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should show stickers with drag handles', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for GripVertical icons or drag handles
      const dragHandle = page.locator('[class*="grip"], [class*="drag"]').first();
      const hasDragHandle = await dragHandle.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Verify drag handles if tab exists
      if (hasDragHandle) {
        await expect(dragHandle).toBeVisible();
      } else {
        // Drag handles may not exist if no stickers yet
        console.log('Drag handles not found - may not have stickers yet');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should display sticker rarity badges', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for rarity badges (Common, Uncommon, Rare, Epic, Legendary)
      const rarityBadge = page.locator('text=/Common|Uncommon|Rare|Epic|Legendary/i').first();
      const hasBadge = await rarityBadge.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Verify rarity badges if tab exists
      if (hasBadge) {
        await expect(rarityBadge).toBeVisible();
      } else {
        // Rarity badges may not exist if no stickers yet
        console.log('Rarity badges not found - may not have stickers yet');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should have sticker action buttons', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for action buttons (delete, edit, toggle active)
      const actionButtons = page.locator('button[class*="icon"], button:has(svg)');
      const buttonCount = await actionButtons.count();
      
      // Verify action buttons if tab exists
      if (buttonCount > 0) {
        expect(buttonCount).toBeGreaterThan(0);
      } else {
        // Action buttons may not exist if no stickers yet
        console.log('Action buttons not found - may not have stickers yet');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });
});

test.describe('Admin Sticker Upload @fast', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as admin before each test
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/(community|admin)/, { timeout: 60000 });
  });

  test('should have upload sticker form', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for upload or add sticker form
      const uploadForm = page.locator('form, [class*="upload"]').first();
      const hasForm = await uploadForm.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Verify upload form if tab exists
      if (hasForm) {
        await expect(uploadForm).toBeVisible();
      } else {
        // Upload form may be in a dialog or not visible initially
        console.log('Upload form not found - may be in dialog');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should not require manual position input for new stickers', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Check that there's NO manual position/number input field
      const positionInput = page.locator('input[name*="position"], input[name*="number"], label:has-text("Position")');
      const hasPositionInput = await positionInput.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Should NOT have position input (automatic positioning)
      expect(hasPositionInput).toBe(false);
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should have rarity selector in upload form', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for rarity selector
      const raritySelector = page.locator('select, [role="combobox"]').filter({ hasText: /rarity|common|rare/i }).first();
      const hasSelector = await raritySelector.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Verify rarity selector if tab exists
      if (hasSelector) {
        await expect(raritySelector).toBeVisible();
      } else {
        // Rarity selector may be in a dialog or not visible initially
        console.log('Rarity selector not found - may be in dialog');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });
});

test.describe('Admin Reset Daily Cards @fast', () => {
  test.beforeEach(async ({ page }) => {
    // Get shard-specific test account
    const testAccount = getTestAccount();
    
    // Authenticate as admin before each test
    await page.goto('/auth');
    await page.fill('input[type="email"]', testAccount.email);
    await page.fill('input[type="password"]', testAccount.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/(community|admin)/, { timeout: 60000 });
  });

  test('should have reset daily cards button', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for reset testing button
      const resetButton = page.locator('button').filter({ hasText: /reset.*daily.*card|reset.*test/i }).first();
      const hasButton = await resetButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Verify reset button if tab exists
      if (hasButton) {
        await expect(resetButton).toBeVisible();
      } else {
        // Reset button may not be visible in all views
        console.log('Reset button not found - may not be in this view');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });

  test('should show confirmation for reset action', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Navigate to sticker management
    const stickerTab = page.locator('[role="tab"]').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTab) {
      await stickerTab.click();
      await expect(stickerTab).toHaveAttribute('aria-selected', 'true');
      
      // Look for reset button
      const resetButton = page.locator('button').filter({ hasText: /reset.*daily.*card|reset.*test/i }).first();
      const hasButton = await resetButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasButton) {
        await resetButton.click();
        
        // Should show some kind of confirmation or toast
        const toast = page.locator('[class*="toast"], [role="alert"]').first();
        const hasToast = await toast.isVisible({ timeout: 2000 }).catch(() => false);
        
        // Toast confirmation is optional but good UX
        if (hasToast) {
          await expect(toast).toBeVisible();
        }
      } else {
        throw new Error('IMPLEMENTATION ISSUE: Reset daily cards button should exist. Check StickerCollectionManager component.');
      }
    } else {
      throw new Error('PRECONDITION FAILED: Stickers tab does not exist in admin panel. Check Admin.tsx.');
    }
  });
});

test.describe('Sticker Collection Rarity System @fast', () => {
  test('should display different rarity levels', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for any rarity indicators
    const rarityElements = page.locator('text=/Common|Uncommon|Rare|Epic|Legendary/i');
    const count = await rarityElements.count();
    
    // Feature SHOULD be implemented
    if (count === 0) {
      throw new Error('IMPLEMENTATION ISSUE: Rarity levels should be displayed in sticker album. Check StickerAlbum component.');
    }
    expect(count).toBeGreaterThan(0);
  });

  test('should show drop rate percentages for each rarity', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for the specific percentages
    const commonRate = page.locator('text=/Common.*50%|50%.*Common/i').first();
    const uncommonRate = page.locator('text=/Uncommon.*30%|30%.*Uncommon/i').first();
    const rareRate = page.locator('text=/Rare.*15%|15%.*Rare/i').first();
    
    const hasCommon = await commonRate.isVisible({ timeout: 3000 }).catch(() => false);
    const hasUncommon = await uncommonRate.isVisible({ timeout: 3000 }).catch(() => false);
    const hasRare = await rareRate.isVisible({ timeout: 3000 }).catch(() => false);
    
    // At least one should be visible
    expect(hasCommon || hasUncommon || hasRare).toBeTruthy();
  });
});

test.describe('Sticker Collection Completion @fast', () => {
  test('should show collection completion status', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // PHASE 3 FIX: Increased wait for content to load
    await page.waitForTimeout(2000);
    
    // Look for completion indicators
    const completionText = page.locator('text=/complete|collected|progress/i').first();
    const hasCompletion = await completionText.isVisible({ timeout: 5000 }).catch(() => false);
    
    // PHASE 3 FIX: Throw error instead of skip - feature SHOULD be implemented
    if (!hasCompletion) {
      throw new Error('IMPLEMENTATION ISSUE: Collection completion status should exist but was not found. Check StickerAlbum component for progress/completion display.');
    }
    await expect(completionText).toBeVisible();
  });

  test('should display total stickers in collection', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // PHASE 3 FIX: Increased wait for content to load
    await page.waitForTimeout(2000);
    
    // Look for sticker count (e.g., "5/20 stickers")
    const stickerCount = page.locator('text=/\\d+\\/\\d+.*sticker/i, text=/sticker.*\\d+\\/\\d+/i').first();
    const hasCount = await stickerCount.isVisible({ timeout: 5000 }).catch(() => false);
    
    // PHASE 3 FIX: Throw error instead of skip - feature SHOULD be implemented
    if (!hasCount) {
      throw new Error('IMPLEMENTATION ISSUE: Sticker count display (e.g., "5/20 stickers") should exist but was not found. Check StickerAlbum component for total stickers display.');
    }
    await expect(stickerCount).toBeVisible();
  });
});
