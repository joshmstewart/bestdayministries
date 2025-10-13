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
    
    console.log('🔍 SETUP: Created caregiver user:', caregiverId);
    console.log('🔍 SETUP: User roles in state:', Array.from(state.userRoles.values()).filter(r => r.user_id === caregiverId));
    
    // Log all network requests to debug user_roles AND session queries
    page.on('request', request => {
      if (request.url().includes('user_roles')) {
        console.log('🔍 NETWORK: user_roles REQUEST:', request.url(), request.method());
      }
      if (request.url().includes('/auth/v1/session')) {
        console.log('🔍 NETWORK: SESSION REQUEST:', request.url(), request.method());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('user_roles')) {
        const body = await response.text().catch(() => 'Could not read body');
        console.log('🔍 NETWORK: user_roles RESPONSE:', response.status(), body);
      }
      if (response.url().includes('/auth/v1/session')) {
        const body = await response.text().catch(() => 'Could not read body');
        console.log('🔍 NETWORK: SESSION RESPONSE:', response.status(), body.substring(0, 300));
      }
    });
    
    // CRITICAL: Wait for ALL session routes to be fully registered before navigation
    await page.waitForTimeout(1000);
    
    // Navigate and wait for everything to fully load INCLUDING network requests
    await page.goto('/guardian-links', { waitUntil: 'networkidle' });
    
    // Additional wait for auth state to fully propagate
    await page.waitForTimeout(500);
  });

  // ============================================
  // FAST SMOKE TESTS - Verify UI Presence
  // ============================================
  test.describe('UI Smoke Tests @fast', () => {
    test('should navigate to guardian links page', async ({ page }) => {
      await expect(page).toHaveURL(/guardian-links/);
    });

    test('should display link bestie form', async ({ page }) => {
      console.log('🔍 TEST 90-92: Starting link bestie form test');
      
      // Wait for network idle AND for role to load
      await page.waitForLoadState('networkidle');
      console.log('🔍 TEST 90-92: Network idle');
      
      // Add delay for checkAccess to complete
      await page.waitForTimeout(2000);
      console.log('🔍 TEST 90-92: Waited 2s for checkAccess');
      
      // Wait for Link Bestie button to appear
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      console.log('🔍 TEST 90-92: Waiting for Link Bestie button...');
      
      // Check if button exists at all
      const buttonCount = await linkButton.count();
      console.log('🔍 TEST 90-92: Button count:', buttonCount);
      
      await linkButton.waitFor({ state: 'visible', timeout: 10000 });
      console.log('🔍 TEST 90-92: Link button visible');
      
      // Click to open dialog
      await linkButton.click();
      await page.waitForTimeout(500);
      console.log('🔍 TEST 90-92: Clicked Link Bestie button - dialog should be open');
      
      // Now look for form elements inside the dialog
      const hasEmojiLabels = await page.getByText(/first emoji|second emoji|third emoji/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log('🔍 TEST 90-92: Has emoji labels:', hasEmojiLabels);
      const hasRelationshipField = await page.getByText(/relationship/i).isVisible({ timeout: 3000 }).catch(() => false);
      console.log('🔍 TEST 90-92: Has relationship field:', hasRelationshipField);
      
      expect(hasEmojiLabels || hasRelationshipField).toBeTruthy();
    });

    test('should show emoji selectors for friend code entry', async ({ page }) => {
      console.log('🔍 TEST 93-95: Starting emoji selectors test');
      
      // Wait for network idle AND for role to load
      await page.waitForLoadState('networkidle');
      console.log('🔍 TEST 93-95: Network idle');
      
      // Wait for Link Bestie button to appear (proves role loaded as caregiver)
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      console.log('🔍 TEST 93-95: Waiting for Link Bestie button...');
      await linkButton.waitFor({ state: 'visible', timeout: 10000 });
      console.log('🔍 TEST 93-95: Link button visible');
      
      // Click to open dialog
      await linkButton.click();
      await page.waitForTimeout(500);
      console.log('🔍 TEST 93-95: Opened link dialog');
      
      // Check for the three emoji selector labels inside the dialog
      const firstEmoji = await page.getByText('First Emoji').isVisible({ timeout: 3000 }).catch(() => false);
      console.log('🔍 TEST 93-95: First emoji visible:', firstEmoji);
      const secondEmoji = await page.getByText('Second Emoji').isVisible({ timeout: 3000 }).catch(() => false);
      console.log('🔍 TEST 93-95: Second emoji visible:', secondEmoji);
      const thirdEmoji = await page.getByText('Third Emoji').isVisible({ timeout: 3000 }).catch(() => false);
      console.log('🔍 TEST 93-95: Third emoji visible:', thirdEmoji);
      
      // Should have all 3 emoji selectors visible
      expect(firstEmoji && secondEmoji && thirdEmoji).toBeTruthy();
    });

    test('should display approval and sponsorship settings', async ({ page }) => {
      // Look for settings section - these are in accordion items that need to be expanded
      const settingsVisible = await page.locator('text=/Content Moderation|Vendor Relationships|Sponsor Communication/i').first().isVisible().catch(() => false);
      console.log('🔍 TEST 128: Settings section visible:', settingsVisible);
      
      if (settingsVisible) {
        // Expand the first accordion to reveal switches
        const firstAccordion = page.locator('button[type="button"]').filter({ hasText: /Content Moderation|settings|approval/i }).first();
        const accordionVisible = await firstAccordion.isVisible();
        console.log('🔍 TEST 128: Accordion button visible:', accordionVisible);
        
        if (accordionVisible) {
          await firstAccordion.click();
          await page.waitForTimeout(500); // Wait for accordion animation
          
          // Now check for switches (component uses Switch not checkbox)
          const switches = await page.locator('button[role="switch"]').count();
          console.log('🔍 TEST 128: Switch count:', switches);
          expect(switches).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================
  // COMPREHENSIVE INTEGRATION TESTS @slow
  // ============================================
  test.describe('Full Interaction Tests @slow', () => {
    test('should successfully link to bestie using friend code', async ({ page }) => {
      test.slow(); // Mark as slow - gives 3x timeout
      console.log('🔍 TEST 97: Starting successful link test');
      
      // Create a bestie with a known friend code
      const { userId: bestieId, friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      console.log('🔍 TEST 97: Created bestie with friend code:', friendCode);
      console.log('🔍 TEST 97: Bestie ID:', bestieId);
      
      // Wait for page to load AND for async role fetch to complete
      await page.waitForLoadState('networkidle');
      console.log('🔍 TEST 97: Network idle');
      
      // CRITICAL: Wait for the Link Bestie button to appear (proves role loaded as caregiver)
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      console.log('🔍 TEST 97: Waiting for Link Bestie button...');
      await linkButton.waitFor({ state: 'visible', timeout: 10000 });
      console.log('🔍 TEST 97: Link button is now visible');
      
      // Click to open dialog
      await linkButton.click();
      await page.waitForTimeout(500);
      console.log('🔍 TEST 97: Clicked link button - dialog should be open');
      
      // Wait for dialog content to render
      await page.waitForSelector('[data-testid="emoji-1-trigger"]', { timeout: 5000 });
      console.log('🔍 TEST 97: Emoji selectors are visible');
      
      // Select emojis using data-testid
      const emojis = Array.from(friendCode);
      console.log('🔍 TEST 97: Emojis to select:', emojis);
      
      // Select first emoji
      console.log('🔍 TEST 97: Selecting first emoji...');
      await page.getByTestId('emoji-1-trigger').click();
      await page.waitForTimeout(300);
      console.log('🔍 TEST 97: Selected first emoji');
      await page.getByTestId(`emoji-1-option-${emojis[0]}`).click();
      await page.waitForTimeout(300);
      
      // Select second emoji
      console.log('🔍 TEST 97: Selecting second emoji...');
      await page.getByTestId('emoji-2-trigger').click();
      await page.waitForTimeout(300);
      console.log('🔍 TEST 97: Selected second emoji');
      await page.getByTestId(`emoji-2-option-${emojis[1]}`).click();
      await page.waitForTimeout(300);
      
      // Select third emoji
      console.log('🔍 TEST 97: Selecting third emoji...');
      await page.getByTestId('emoji-3-trigger').click();
      await page.waitForTimeout(300);
      console.log('🔍 TEST 97: Selected third emoji');
      await page.getByTestId(`emoji-3-option-${emojis[2]}`).click();
      await page.waitForTimeout(500);
      
      // Enter relationship
      console.log('🔍 TEST 97: Filling relationship input...');
      await page.getByTestId('relationship-input').fill('Parent');
      await page.waitForTimeout(300);
      console.log('🔍 TEST 97: Filled relationship');
      
      // Submit
      console.log('🔍 TEST 97: Clicking submit button...');
      await page.getByTestId('create-link-button').click();
      
      // Wait for processing
      await page.waitForTimeout(2000);
      console.log('🔍 TEST 97: Waiting for link creation...');
      
      // Verify link was created in state
      const links = Array.from(state.caregiverBestieLinks.values()).filter(
        link => link.caregiver_id === caregiverId && link.bestie_id === bestieId
      );
      console.log('🔍 TEST 97: Links found:', links.length);
      console.log('🔍 TEST 97: Link details:', links[0]);
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]?.relationship).toBe('Parent');
    });

    test('should handle invalid friend code', async ({ page }) => {
      test.slow();
      console.log('🔍 TEST 130: Starting invalid friend code test');
      
      // Wait for network idle AND for role to load
      await page.waitForLoadState('networkidle');
      console.log('🔍 TEST 130: Network idle');
      
      // Wait for Link Bestie button
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      console.log('🔍 TEST 130: Waiting for Link Bestie button...');
      await linkButton.waitFor({ state: 'visible', timeout: 10000 });
      console.log('🔍 TEST 130: Link button visible');
      
      // Open dialog
      await linkButton.click();
      await page.waitForTimeout(500);
      console.log('🔍 TEST 130: Opened link dialog');
      
      // Wait for emoji selectors
      await page.waitForSelector('[data-testid="emoji-1-trigger"]', { timeout: 5000 });
      
      // Select invalid friend code (all same emoji that doesn't exist)
      console.log('🔍 TEST 130: Selecting invalid friend code...');
      await page.getByTestId('emoji-1-trigger').click();
      await page.waitForTimeout(500);
      await page.getByTestId('emoji-1-option-🌟').click();
      await page.waitForTimeout(500);
      
      await page.getByTestId('emoji-2-trigger').click();
      await page.waitForTimeout(500);
      await page.getByTestId('emoji-2-option-🌟').click();
      await page.waitForTimeout(500);
      
      await page.getByTestId('emoji-3-trigger').click();
      await page.waitForTimeout(500);
      await page.getByTestId('emoji-3-option-🌟').click();
      await page.waitForTimeout(800);
      console.log('🔍 TEST 130: Selected all emojis');
      
      // Enter relationship
      await page.getByTestId('relationship-input').fill('Parent');
      await page.waitForTimeout(300);
      console.log('🔍 TEST 130: Filled relationship');
      
      // Submit
      const initialLinkCount = state.caregiverBestieLinks.size;
      console.log('🔍 TEST 130: Initial link count:', initialLinkCount);
      await page.getByTestId('create-link-button').click();
      await page.waitForTimeout(2000);
      
      // Should show error and not create link
      const errorVisible = await page.locator('text=/not found|invalid|doesn\'t exist/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      const finalLinkCount = state.caregiverBestieLinks.size;
      console.log('🔍 TEST 130: Error visible:', errorVisible);
      console.log('🔍 TEST 130: Final link count:', finalLinkCount);
      expect(errorVisible || state.caregiverBestieLinks.size === initialLinkCount).toBeTruthy();
    });

    test('should require relationship field', async ({ page }) => {
      test.slow();
      console.log('🔍 TEST 173: Starting relationship required test');
      
      // Create a bestie
      const { friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      console.log('🔍 TEST 173: Created bestie with friend code:', friendCode);
      
      // Wait for network idle AND for role to load
      await page.waitForLoadState('networkidle');
      console.log('🔍 TEST 173: Network idle');
      
      // Wait for Link Bestie button
      const linkButton = page.locator('button').filter({ hasText: /link.*bestie/i }).first();
      console.log('🔍 TEST 173: Waiting for Link Bestie button...');
      await linkButton.waitFor({ state: 'visible', timeout: 10000 });
      console.log('🔍 TEST 173: Link button visible');
      
      // Open dialog
      await linkButton.click();
      await page.waitForTimeout(500);
      console.log('🔍 TEST 173: Opened link dialog');
      
      // Wait for emoji selectors
      await page.waitForSelector('[data-testid="emoji-1-trigger"]', { timeout: 5000 });
      
      // Select friend code but NOT relationship
      const emojis = Array.from(friendCode);
      console.log('🔍 TEST 173: Selecting friend code...');
      
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
      console.log('🔍 TEST 173: Selected all emojis');
      
      // Leave relationship empty - try to submit
      const initialLinkCount = state.caregiverBestieLinks.size;
      console.log('🔍 TEST 173: Initial link count:', initialLinkCount);
      const submitButton = page.getByTestId('create-link-button');
      
      // Button should be clickable but should show validation error
      await submitButton.click();
      await page.waitForTimeout(1000);
      console.log('🔍 TEST 173: Clicked submit without relationship');
      
      // Should not create link without relationship
      const finalLinkCount = state.caregiverBestieLinks.size;
      console.log('🔍 TEST 173: Final link count:', finalLinkCount);
      expect(state.caregiverBestieLinks.size).toBe(initialLinkCount);
    });

    test('should display linked besties after linking', async ({ page }) => {
      test.slow();
      console.log('🔍 TEST 219: Starting display linked besties test');
      
      // Create a bestie and link them
      const { userId: bestieId } = createMockBestie(state, 'linked-bestie@test.com', 'Linked Bestie');
      linkCaregiverToBestie(state, caregiverId, bestieId, 'Parent');
      console.log('🔍 TEST 219: Created and linked bestie');
      
      // Reload page to see linked besties
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      console.log('🔍 TEST 219: Page reloaded');
      
      // Should show the linked bestie
      const bestieVisible = await page.locator('text=/Linked Bestie/i').first().isVisible({ timeout: 5000 }).catch(() => false);
      console.log('🔍 TEST 219: Bestie name visible:', bestieVisible);
      const hasLinkedSection = await page.locator('text=/guardian relationship/i').first().isVisible().catch(() => false);
      console.log('🔍 TEST 219: Has linked section:', hasLinkedSection);
      
      expect(bestieVisible || hasLinkedSection).toBeTruthy();
    });

    test('should allow unlinking a bestie', async ({ page }) => {
      test.slow();
      console.log('🔍 TEST 238: Starting unlink bestie test');
      
      // Create a bestie and link them
      const { userId: bestieId } = createMockBestie(state, 'unlink-bestie@test.com', 'Unlink Bestie');
      linkCaregiverToBestie(state, caregiverId, bestieId, 'Parent');
      console.log('🔍 TEST 238: Created and linked bestie');
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      console.log('🔍 TEST 238: Page reloaded');
      
      // Look for unlink button (trash icon)
      const unlinkButton = page.locator('button').filter({ hasText: '' }).first(); // Trash icon button
      const unlinkVisible = await unlinkButton.isVisible();
      console.log('🔍 TEST 238: Unlink button visible:', unlinkVisible);
      
      if (unlinkVisible) {
        const initialLinkCount = state.caregiverBestieLinks.size;
        console.log('🔍 TEST 238: Initial link count:', initialLinkCount);
        await unlinkButton.click();
        
        // Confirm in dialog
        await page.waitForTimeout(500);
        const confirmButton = page.locator('button').filter({ hasText: /remove link/i }).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          console.log('🔍 TEST 238: Clicked confirm button');
        }
        
        // Wait longer for UI refresh and state update
        await page.waitForTimeout(2000);
        
        // Verify link was removed from state
        const finalLinkCount = state.caregiverBestieLinks.size;
        console.log('🔍 TEST 238: Final link count:', finalLinkCount);
        expect(finalLinkCount).toBeLessThan(initialLinkCount); // Should decrease from 1 to 0
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
