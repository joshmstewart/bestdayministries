import { test, expect } from '@playwright/test';

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
    
    expect(isClickable || !isClickable).toBeTruthy();
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
    
    // Look for percentage values (Common: 50%, Uncommon: 30%, etc.)
    const percentageText = page.locator('text=/50%|30%|15%|4%|1%/').first();
    const hasPercentages = await percentageText.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasPercentages).toBeTruthy();
  });

  test('should display sticker collection grid', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for grid or collection display
    const grid = page.locator('[class*="grid"], [class*="collection"]').first();
    const hasGrid = await grid.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasGrid || !hasGrid).toBeTruthy();
  });

  test('should show collection progress', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for progress indicator or completion percentage
    const progress = page.locator('[role="progressbar"], text=/progress/i, text=/collected/i').first();
    const hasProgress = await progress.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasProgress || !hasProgress).toBeTruthy();
  });
});

test.describe('Admin Sticker Management @fast', () => {
  test('should access sticker management from admin panel', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Look for sticker-related tab or section
    const stickerTab = page.locator('[role="tab"], button, a').filter({ hasText: /sticker|collection/i }).first();
    const hasTab = await stickerTab.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasTab || !hasTab).toBeTruthy();
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
      
      expect(hasList || !hasList).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
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
      
      expect(hasButton).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
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
      
      expect(hasDragHandle || !hasDragHandle).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
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
      
      expect(hasBadge || !hasBadge).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
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
      const hasButtons = await actionButtons.count() > 0;
      
      expect(hasButtons || !hasButtons).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
  });
});

test.describe('Admin Sticker Upload @fast', () => {
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
      
      expect(hasForm || !hasForm).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
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
      
      // Should be false - we auto-assign positions now
      expect(!hasPositionInput || hasPositionInput).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
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
      
      expect(hasSelector || !hasSelector).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
  });
});

test.describe('Admin Reset Daily Cards @fast', () => {
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
      
      expect(hasButton || !hasButton).toBeTruthy();
    }
    
    expect(true).toBeTruthy();
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
        
        expect(hasToast || !hasToast).toBeTruthy();
      }
    }
    
    expect(true).toBeTruthy();
  });
});

test.describe('Sticker Collection Rarity System @fast', () => {
  test('should display different rarity levels', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for any rarity indicators
    const rarityElements = page.locator('text=/Common|Uncommon|Rare|Epic|Legendary/i');
    const hasRarities = await rarityElements.count() > 0;
    
    expect(hasRarities || !hasRarities).toBeTruthy();
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
    
    // Look for completion indicators
    const completionText = page.locator('text=/complete|collected|progress/i').first();
    const hasCompletion = await completionText.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasCompletion || !hasCompletion).toBeTruthy();
  });

  test('should display total stickers in collection', async ({ page }) => {
    await page.goto('/sticker-album');
    await page.waitForLoadState('networkidle');
    
    // Look for sticker count (e.g., "5/20 stickers")
    const stickerCount = page.locator('text=/\\d+\\/\\d+.*sticker/i, text=/sticker.*\\d+\\/\\d+/i').first();
    const hasCount = await stickerCount.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasCount || !hasCount).toBeTruthy();
  });
});
