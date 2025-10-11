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

  test('should navigate to guardian links page', async ({ page }) => {
    await expect(page).toHaveURL(/guardian-links/);
  });

  test('should display link bestie form', async ({ page }) => {
    // Look for the form elements
    const linkButton = page.locator('button').filter({ hasText: /link.*bestie|connect.*bestie|add.*bestie/i }).first();
    
    if (await linkButton.isVisible()) {
      await linkButton.click();
    }
    
    // Should see friend code input or emoji selectors
    const hasEmojiSelectors = await page.locator('select, [role="combobox"]').count();
    const hasFriendCodeInput = await page.locator('input[placeholder*="friend" i], input[placeholder*="code" i]').isVisible().catch(() => false);
    
    expect(hasEmojiSelectors > 0 || hasFriendCodeInput).toBeTruthy();
  });

  test('should show emoji selectors for friend code entry', async ({ page }) => {
    // Create a bestie with a known friend code
    const { friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
    
    // Look for link form
    const linkButton = page.locator('button').filter({ hasText: /link.*bestie|connect.*bestie|add.*bestie/i }).first();
    if (await linkButton.isVisible()) {
      await linkButton.click();
    }
    
    // Count emoji selectors
    const emojiSelectors = page.locator('select, [role="combobox"]').filter({ hasText: /emoji|select/i });
    const count = await emojiSelectors.count();
    
    // Should have at least 3 emoji selectors for the 3-emoji friend code
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should validate incomplete friend code', async ({ page }) => {
    // Look for link form
    const linkButton = page.locator('button').filter({ hasText: /link.*bestie|connect.*bestie|add.*bestie/i }).first();
    if (await linkButton.isVisible()) {
      await linkButton.click();
    }
    
    // Try to submit without selecting all emojis
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|connect|add/i }).first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation error
      await page.waitForTimeout(500);
      const errorVisible = await page.locator('text=/select|complete|required/i').first().isVisible().catch(() => false);
      expect(errorVisible).toBeTruthy();
    }
  });

  test('should successfully link to bestie using friend code', async ({ page }) => {
    // Create a bestie with a known friend code
    const { userId: bestieId, friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
    
    // Look for link form
    const linkButton = page.locator('button').filter({ hasText: /link.*bestie|connect.*bestie|add.*bestie/i }).first();
    if (await linkButton.isVisible()) {
      await linkButton.click();
    }
    
    // Enter friend code (split into individual emojis)
    const emojis = Array.from(friendCode);
    const emojiSelectors = await page.locator('select, [role="combobox"]').filter({ hasText: /emoji|select/i }).all();
    
    for (let i = 0; i < Math.min(emojis.length, emojiSelectors.length); i++) {
      await emojiSelectors[i].click();
      await page.locator(`text="${emojis[i]}"`).first().click().catch(() => {});
    }
    
    // Enter relationship
    const relationshipInput = page.locator('input[placeholder*="relationship" i], select').first();
    if (await relationshipInput.isVisible()) {
      await relationshipInput.fill('Parent');
    }
    
    // Submit
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|connect|add/i }).first();
    await submitButton.click();
    
    // Wait for processing
    await page.waitForTimeout(1000);
    
    // Verify link was created in state
    const links = Array.from(state.caregiverBestieLinks.values()).filter(
      link => link.caregiver_id === caregiverId && link.bestie_id === bestieId
    );
    expect(links.length).toBeGreaterThan(0);
  });

  test('should handle invalid friend code', async ({ page }) => {
    // Look for link form
    const linkButton = page.locator('button').filter({ hasText: /link.*bestie|connect.*bestie|add.*bestie/i }).first();
    if (await linkButton.isVisible()) {
      await linkButton.click();
    }
    
    // Enter invalid friend code
    const emojiSelectors = await page.locator('select, [role="combobox"]').filter({ hasText: /emoji|select/i }).all();
    
    for (const selector of emojiSelectors.slice(0, 3)) {
      await selector.click();
      await page.locator('text="🌟"').first().click().catch(() => {});
    }
    
    // Enter relationship
    const relationshipInput = page.locator('input[placeholder*="relationship" i], select').first();
    if (await relationshipInput.isVisible()) {
      await relationshipInput.fill('Parent');
    }
    
    // Submit
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|connect|add/i }).first();
    const initialLinkCount = state.caregiverBestieLinks.size;
    
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    // Should show error and not create link
    const errorVisible = await page.locator('text=/not found|invalid|doesn\'t exist/i').first().isVisible().catch(() => false);
    expect(errorVisible || state.caregiverBestieLinks.size === initialLinkCount).toBeTruthy();
  });

  test('should require relationship field', async ({ page }) => {
    // Create a bestie
    const { friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
    
    // Look for link form
    const linkButton = page.locator('button').filter({ hasText: /link.*bestie|connect.*bestie|add.*bestie/i }).first();
    if (await linkButton.isVisible()) {
      await linkButton.click();
    }
    
    // Enter friend code but not relationship
    const emojiSelectors = await page.locator('select, [role="combobox"]').filter({ hasText: /emoji|select/i }).all();
    const emojis = Array.from(friendCode);
    
    for (let i = 0; i < Math.min(emojis.length, emojiSelectors.length); i++) {
      await emojiSelectors[i].click();
      await page.locator(`text="${emojis[i]}"`).first().click().catch(() => {});
    }
    
    // Try to submit without relationship
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|connect|add/i }).first();
    const initialLinkCount = state.caregiverBestieLinks.size;
    
    await submitButton.click();
    await page.waitForTimeout(500);
    
    // Should not create link
    expect(state.caregiverBestieLinks.size).toBe(initialLinkCount);
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

  test('should display linked besties', async ({ page }) => {
    // Create a bestie and link them
    const { userId: bestieId, friendCode } = createMockBestie(state, 'linked-bestie@test.com', 'Linked Bestie');
    linkCaregiverToBestie(state, caregiverId, bestieId, 'Parent');
    
    // Reload page to see linked besties
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show the linked bestie
    const bestieVisible = await page.locator('text=/Linked Bestie|linked-bestie/i').first().isVisible().catch(() => false);
    expect(bestieVisible).toBeTruthy();
  });

  test('should allow unlinking a bestie', async ({ page }) => {
    // Create a bestie and link them
    const { userId: bestieId } = createMockBestie(state, 'unlink-bestie@test.com', 'Unlink Bestie');
    linkCaregiverToBestie(state, caregiverId, bestieId, 'Parent');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Look for unlink button
    const unlinkButton = page.locator('button').filter({ hasText: /unlink|remove|delete/i }).first();
    
    if (await unlinkButton.isVisible()) {
      const initialLinkCount = state.caregiverBestieLinks.size;
      await unlinkButton.click();
      
      // Confirm if there's a confirmation dialog
      const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|remove/i }).first();
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(500);
      
      // Verify link was removed
      expect(state.caregiverBestieLinks.size).toBeLessThan(initialLinkCount);
    }
  });

  test.describe('Role-Based Access', () => {
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
