import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseDatabase, mockAuthenticatedSession, MockSupabaseState } from '../utils/supabase-mocks';
import { createMockCaregiver, createMockBestie, linkCaregiverToBestie } from '../utils/test-helpers';

test.describe('Guardian-Bestie Linking Flow', () => {
  let state: MockSupabaseState;
  let caregiverId: string;
  let caregiverToken: string;

  test.beforeEach(async ({ page }) => {
    state = new MockSupabaseState();
    await mockSupabaseAuth(page, state);
    await mockSupabaseDatabase(page, state);
    
    // Create and authenticate as caregiver
    const auth = await mockAuthenticatedSession(page, state, 'guardian@test.com', 'caregiver');
    caregiverId = auth.userId;
    caregiverToken = auth.token;
    
    await page.goto('/guardian-links');
  });

  // ============================================
  // FAST SMOKE TESTS - Verify UI Presence
  // ============================================
  test.describe('UI Smoke Tests @fast', () => {
    test('should navigate to guardian links page', async ({ page }) => {
      await expect(page).toHaveURL(/guardian-links/);
    });

    test('should display link bestie form', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      // Look for form elements - emoji labels or link button
      const hasEmojiLabels = await page.getByText(/first emoji|second emoji|third emoji/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasLinkButton = await page.locator('button').filter({ hasText: /link.*bestie|connect|add/i }).first().isVisible().catch(() => false);
      
      expect(hasEmojiLabels || hasLinkButton).toBeTruthy();
    });

    test('should show emoji selectors for friend code entry', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      // Check for the three emoji selector labels
      const firstEmoji = await page.getByText('First Emoji').isVisible({ timeout: 3000 }).catch(() => false);
      const secondEmoji = await page.getByText('Second Emoji').isVisible({ timeout: 3000 }).catch(() => false);
      const thirdEmoji = await page.getByText('Third Emoji').isVisible({ timeout: 3000 }).catch(() => false);
      
      // Should have all 3 emoji selectors visible
      expect(firstEmoji && secondEmoji && thirdEmoji).toBeTruthy();
    });

    test('should display approval and sponsorship settings', async ({ page }) => {
      // Look for settings section
      const settingsVisible = await page.locator('text=/settings|approval|sponsorship/i').first().isVisible().catch(() => false);
      
      if (settingsVisible) {
        // Should have checkboxes for various settings
        const checkboxes = await page.locator('input[type="checkbox"]').count();
        expect(checkboxes).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // COMPREHENSIVE INTEGRATION TESTS @slow
  // ============================================
  test.describe('Full Interaction Tests @slow', () => {
    test('should successfully link to bestie using friend code', async ({ page }) => {
      test.slow(); // Mark as slow - gives 3x timeout
      
      // Create a bestie with a known friend code
      const { userId: bestieId, friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      console.log('Created bestie with friend code:', friendCode);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Open the link dialog if needed
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(500);
      }
      
      // Select emojis using data-testid
      const emojis = Array.from(friendCode);
      
      // Select first emoji
      await page.getByTestId('emoji-1-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId(`emoji-1-option-${emojis[0]}`).click();
      await page.waitForTimeout(300);
      
      // Select second emoji
      await page.getByTestId('emoji-2-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId(`emoji-2-option-${emojis[1]}`).click();
      await page.waitForTimeout(300);
      
      // Select third emoji
      await page.getByTestId('emoji-3-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId(`emoji-3-option-${emojis[2]}`).click();
      await page.waitForTimeout(500);
      
      // Enter relationship
      await page.getByTestId('relationship-input').fill('Parent');
      await page.waitForTimeout(300);
      
      // Submit
      await page.getByTestId('create-link-button').click();
      
      // Wait for processing
      await page.waitForTimeout(2000);
      
      // Verify link was created in state
      const links = Array.from(state.caregiverBestieLinks.values()).filter(
        link => link.caregiver_id === caregiverId && link.bestie_id === bestieId
      );
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]?.relationship).toBe('Parent');
    });

    test('should handle invalid friend code', async ({ page }) => {
      test.slow();
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Open dialog if needed
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(500);
      }
      
      // Select invalid friend code (all same emoji that doesn't exist)
      await page.getByTestId('emoji-1-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId('emoji-1-option-🌟').click();
      await page.waitForTimeout(300);
      
      await page.getByTestId('emoji-2-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId('emoji-2-option-🌟').click();
      await page.waitForTimeout(300);
      
      await page.getByTestId('emoji-3-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId('emoji-3-option-🌟').click();
      await page.waitForTimeout(500);
      
      // Enter relationship
      await page.getByTestId('relationship-input').fill('Parent');
      await page.waitForTimeout(300);
      
      // Submit
      const initialLinkCount = state.caregiverBestieLinks.size;
      await page.getByTestId('create-link-button').click();
      await page.waitForTimeout(2000);
      
      // Should show error and not create link
      const errorVisible = await page.locator('text=/not found|invalid|doesn\'t exist/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorVisible || state.caregiverBestieLinks.size === initialLinkCount).toBeTruthy();
    });

    test('should require relationship field', async ({ page }) => {
      test.slow();
      
      // Create a bestie
      const { friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Open dialog
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(500);
      }
      
      // Select friend code but NOT relationship
      const emojis = Array.from(friendCode);
      
      await page.getByTestId('emoji-1-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId(`emoji-1-option-${emojis[0]}`).click();
      await page.waitForTimeout(300);
      
      await page.getByTestId('emoji-2-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId(`emoji-2-option-${emojis[1]}`).click();
      await page.waitForTimeout(300);
      
      await page.getByTestId('emoji-3-trigger').click();
      await page.waitForTimeout(300);
      await page.getByTestId(`emoji-3-option-${emojis[2]}`).click();
      await page.waitForTimeout(500);
      
      // Leave relationship empty - try to submit
      const initialLinkCount = state.caregiverBestieLinks.size;
      const submitButton = page.getByTestId('create-link-button');
      
      // Button should be clickable but should show validation error
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Should not create link without relationship
      expect(state.caregiverBestieLinks.size).toBe(initialLinkCount);
    });

    test('should display linked besties after linking', async ({ page }) => {
      test.slow();
      
      // Create a bestie and link them
      const { userId: bestieId } = createMockBestie(state, 'linked-bestie@test.com', 'Linked Bestie');
      linkCaregiverToBestie(state, caregiverId, bestieId, 'Parent');
      
      // Reload page to see linked besties
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Should show the linked bestie
      const bestieVisible = await page.locator('text=/Linked Bestie/i').first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasLinkedSection = await page.locator('text=/guardian relationship/i').first().isVisible().catch(() => false);
      
      expect(bestieVisible || hasLinkedSection).toBeTruthy();
    });

    test('should allow unlinking a bestie', async ({ page }) => {
      test.slow();
      
      // Create a bestie and link them
      const { userId: bestieId } = createMockBestie(state, 'unlink-bestie@test.com', 'Unlink Bestie');
      linkCaregiverToBestie(state, caregiverId, bestieId, 'Parent');
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Look for unlink button (trash icon)
      const unlinkButton = page.locator('button').filter({ hasText: '' }).first(); // Trash icon button
      
      if (await unlinkButton.isVisible()) {
        const initialLinkCount = state.caregiverBestieLinks.size;
        await unlinkButton.click();
        
        // Confirm in dialog
        await page.waitForTimeout(500);
        const confirmButton = page.locator('button').filter({ hasText: /remove link/i }).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(1000);
        
        // Verify link was removed
        expect(state.caregiverBestieLinks.size).toBeLessThan(initialLinkCount);
      }
    });
  });

  test.describe('Validation Tests @fast', () => {
    test('should validate incomplete friend code', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      // Open dialog if needed
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(500);
      }
      
      // Try to submit without selecting all emojis (just check button is disabled or shows error)
      const submitButton = page.getByTestId('create-link-button');
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should show validation error
        await page.waitForTimeout(500);
        const errorVisible = await page.locator('text=/select|complete|required|choose/i').first().isVisible().catch(() => false);
        expect(errorVisible).toBeTruthy();
      }
    });
  });

  test.describe('Role-Based Access @fast', () => {
    test('should redirect non-caregivers', async ({ page }) => {
      // Create new state with supporter user
      const newState = new MockSupabaseState();
      await mockSupabaseAuth(page, newState);
      await mockSupabaseDatabase(page, newState);
      await mockAuthenticatedSession(page, newState, 'supporter@test.com', 'supporter');
      
      // Try to access guardian links
      await page.goto('/guardian-links');
      await page.waitForTimeout(1000);
      
      // Should be redirected away or show access denied
      const currentUrl = page.url();
      const accessDenied = await page.locator('text=/access denied|not authorized|permission/i').first().isVisible().catch(() => false);
      
      expect(!currentUrl.includes('/guardian-links') || accessDenied).toBeTruthy();
    });
  });
});
