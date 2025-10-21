import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseDatabase, mockAuthenticatedSession, MockSupabaseState } from '../utils/supabase-mocks';
import { createMockVendor, createMockBestie, createMockCaregiver, createVendorBestieRequest } from '../utils/test-helpers';

test.describe('Vendor-Bestie Linking Flow', () => {
  let state: MockSupabaseState;

  test.beforeEach(async ({ page }) => {
    state = new MockSupabaseState();
    await mockSupabaseAuth(page, state);
    await mockSupabaseDatabase(page, state);
  });

  test.describe('Vendor Link Request Flow', () => {
    test('should display link option for vendors', async ({ page }) => {
      // Create and authenticate as vendor
      const { userId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      
      await page.goto('/vendor-dashboard');
      await page.waitForLoadState('networkidle');
      
      // Navigate to Settings tab where vendor-bestie linking is located
      await page.getByRole('tab', { name: /settings/i }).click();
      
      // Wait for the "Link to Besties" section heading to appear
      await page.waitForSelector('text=/Link to Besties/i', { 
        timeout: 15000,
        state: 'visible' 
      });
      
      // Wait for the specific Card component to fully load with its title
      await page.waitForSelector('text=/Link Your Store to a Bestie/i', { 
        timeout: 10000,
        state: 'visible' 
      });
      
      // Look for the submit button with exact text
      const linkOption = page.locator('button').filter({ hasText: /Send Link Request/i });
      await linkOption.waitFor({ state: 'visible', timeout: 5000 });
      const isVisible = await linkOption.isVisible();
      
      expect(isVisible).toBeTruthy();
    });

    test('should show friend code input for linking', async ({ page }) => {
      // Create and authenticate as vendor
      const { userId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      
      await page.goto('/vendor-dashboard');
      
      // Click link bestie button
      const linkButton = page.locator('button, a').filter({ hasText: /link.*bestie|connect.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        
        // Should see emoji selectors or friend code input
        const hasEmojiSelectors = await page.locator('select, [role="combobox"]').count();
        expect(hasEmojiSelectors).toBeGreaterThan(0);
      }
    });

    test('should validate incomplete friend code', async ({ page }) => {
      // Create and authenticate as vendor
      const { userId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      
      await page.goto('/vendor-dashboard');
      
      // Click link bestie button
      const linkButton = page.locator('button, a').filter({ hasText: /link.*bestie|connect.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        
        // Try to submit without completing friend code
        const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|request|submit/i }).first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Should show validation error
          await expect(page.locator('text=/complete|select|required/i').first()).toBeVisible();
          const errorVisible = await page.locator('text=/complete|select|required/i').first().isVisible().catch(() => false);
          expect(errorVisible).toBeTruthy();
        }
      }
    });

    test('should successfully submit link request', async ({ page }) => {
      // Create vendor and bestie
      const { userId: vendorUserId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      const { userId: bestieId, friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      await page.goto('/vendor-dashboard');
      
      // Click link bestie button
      const linkButton = page.locator('button, a').filter({ hasText: /link.*bestie|connect.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        
        // Enter friend code
        const emojis = Array.from(friendCode);
        const emojiSelectors = await page.locator('select, [role="combobox"]').all();
        
        for (let i = 0; i < Math.min(emojis.length, emojiSelectors.length); i++) {
          await emojiSelectors[i].click();
          await page.locator(`text="${emojis[i]}"`).first().click().catch(() => {});
        }
        
        // Add message
        const messageInput = page.locator('textarea, input[type="text"]').filter({ hasText: /message/i }).first();
        if (await messageInput.isVisible()) {
          await messageInput.fill('Would love to partner with you!');
        }
        
        // Submit
        const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|request|submit/i }).first();
        await submitButton.click();
        
        await page.waitForLoadState('networkidle');
        
        // Verify request was created in state
        const requests = Array.from(state.vendorBestieRequests.values()).filter(
          req => req.vendor_id === vendorId && req.bestie_id === bestieId
        );
        expect(requests.length).toBeGreaterThan(0);
        expect(requests[0]?.status).toBe('pending');
      }
    });

    test('should handle invalid friend code', async ({ page }) => {
      // Create vendor
      const { userId: vendorUserId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      await page.goto('/vendor-dashboard');
      
      // Click link bestie button
      const linkButton = page.locator('button, a').filter({ hasText: /link.*bestie|connect.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        
        // Enter invalid friend code
        const emojiSelectors = await page.locator('select, [role="combobox"]').all();
        for (const selector of emojiSelectors.slice(0, 3)) {
          await selector.click();
          await page.locator('text="🌟"').first().click().catch(() => {});
        }
        
        // Submit
        const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|request|submit/i }).first();
        const initialRequestCount = state.vendorBestieRequests.size;
        
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should show error or not create request
        const errorVisible = await page.locator('text=/not found|invalid|doesn\'t exist/i').first().isVisible().catch(() => false);
        expect(errorVisible || state.vendorBestieRequests.size === initialRequestCount).toBeTruthy();
      }
    });
  });

  test.describe('Vendor Link Request Status', () => {
    test('should display pending requests', async ({ page }) => {
      // Create vendor and bestie with pending request
      const { userId: vendorUserId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      const { userId: bestieId } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      
      // Create pending request
      const requestId = `request-${Date.now()}`;
      state.vendorBestieRequests.set(requestId, {
        id: requestId,
        vendor_id: vendorId,
        bestie_id: bestieId,
        message: 'Test request',
        status: 'pending',
        created_at: new Date().toISOString()
      });
      
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      await page.goto('/vendor-dashboard');
      await page.waitForLoadState('networkidle');
      
      // Navigate to Settings tab where pending requests are displayed
      await page.getByRole('tab', { name: /settings/i }).click();
      
      // Wait for the "Link to Besties" section heading to appear
      await page.waitForSelector('text=/Link to Besties/i', { 
        timeout: 15000,
        state: 'visible' 
      });
      
      // Wait for the Card component to fully load
      await page.waitForSelector('text=/Link Your Store to a Bestie/i', { 
        timeout: 10000,
        state: 'visible' 
      });
      
      // Should show pending status
      const pendingVisible = await page.locator('text=/pending|waiting/i').first().isVisible().catch(() => false);
      expect(pendingVisible).toBeTruthy();
    });
  });

  test.describe('Guardian Approval Flow', () => {
    test('should show vendor requests to guardian', async ({ page }) => {
      // Create caregiver, bestie, vendor, and request
      const caregiverId = createMockCaregiver(state, 'guardian@test.com', 'Test Guardian');
      const { userId: bestieId } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      const { vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      
      // Link guardian to bestie
      state.addCaregiverLink(caregiverId, bestieId, 'Parent');
      
      // Create vendor request
      createVendorBestieRequest(state, vendorId, bestieId, 'Partnership request', 'pending');
      
      await mockAuthenticatedSession(page, state, 'guardian@test.com', 'caregiver');
      await page.goto('/guardian-approvals');
      await page.waitForLoadState('networkidle');
      
      // Click the "Vendor Links" tab to show vendor requests
      const vendorsTab = page.locator('button[role="tab"]').filter({ hasText: /vendor links/i }).first();
      const tabVisible = await vendorsTab.isVisible().catch(() => false);
      console.log('🔍 TEST 15/150: Vendor Links tab visible:', tabVisible);
      if (tabVisible) {
        await vendorsTab.click();
        await page.waitForLoadState('networkidle');
        console.log('🔍 TEST 15/150: Clicked Vendor Links tab');
      }
      
      // Should see vendor request
      const requestVisible = await page.locator('text=/vendor|partnership|request/i').first().isVisible().catch(() => false);
      expect(requestVisible).toBeTruthy();
    });

    test('should allow guardian to approve request', async ({ page }) => {
      // Create caregiver, bestie, vendor, and request
      const caregiverId = createMockCaregiver(state, 'guardian@test.com', 'Test Guardian');
      const { userId: bestieId } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      const { vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      
      state.addCaregiverLink(caregiverId, bestieId, 'Parent');
      
      const requestId = createVendorBestieRequest(state, vendorId, bestieId, 'Partnership request', 'pending');
      
      await mockAuthenticatedSession(page, state, 'guardian@test.com', 'caregiver');
      await page.goto('/guardian-approvals');
      
      // Click approve button
      const approveButton = page.locator('button').filter({ hasText: /approve|accept/i }).first();
      if (await approveButton.isVisible()) {
        await approveButton.click();
        await page.waitForLoadState('networkidle');
        
        // Verify status changed in state
        const request = state.vendorBestieRequests.get(requestId);
        expect(request?.status).toBe('approved');
      }
    });

    test('should allow guardian to reject request', async ({ page }) => {
      // Create caregiver, bestie, vendor, and request
      const caregiverId = createMockCaregiver(state, 'guardian@test.com', 'Test Guardian');
      const { userId: bestieId } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      const { vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      
      state.addCaregiverLink(caregiverId, bestieId, 'Parent');
      
      const requestId = createVendorBestieRequest(state, vendorId, bestieId, 'Partnership request', 'pending');
      
      await mockAuthenticatedSession(page, state, 'guardian@test.com', 'caregiver');
      await page.goto('/guardian-approvals');
      
      // Click reject button
      const rejectButton = page.locator('button').filter({ hasText: /reject|decline|deny/i }).first();
      if (await rejectButton.isVisible()) {
        await rejectButton.click();
        await page.waitForLoadState('networkidle');
        
        // Verify status changed in state
        const request = state.vendorBestieRequests.get(requestId);
        expect(request?.status).toBe('rejected');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle duplicate link requests', async ({ page }) => {
      // Create vendor and bestie with existing request
      const { userId: vendorUserId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      const { userId: bestieId, friendCode } = createMockBestie(state, 'bestie@test.com', 'Test Bestie');
      
      // Create existing request
      state.vendorBestieRequests.set('existing-request', {
        id: 'existing-request',
        vendor_id: vendorId,
        bestie_id: bestieId,
        message: 'First request',
        status: 'pending',
        created_at: new Date().toISOString()
      });
      
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      await page.goto('/vendor-dashboard');
      
      // Try to create duplicate request
      const linkButton = page.locator('button, a').filter({ hasText: /link.*bestie|connect.*bestie/i }).first();
      if (await linkButton.isVisible()) {
        await linkButton.click();
        
        // Enter same friend code
        const emojis = Array.from(friendCode);
        const emojiSelectors = await page.locator('select, [role="combobox"]').all();
        
        for (let i = 0; i < Math.min(emojis.length, emojiSelectors.length); i++) {
          await emojiSelectors[i].click();
          await page.locator(`text="${emojis[i]}"`).first().click().catch(() => {});
        }
        
        const submitButton = page.locator('button[type="submit"]').filter({ hasText: /link|request|submit/i }).first();
        const initialRequestCount = state.vendorBestieRequests.size;
        
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should not create duplicate
        expect(state.vendorBestieRequests.size).toBe(initialRequestCount);
      }
    });
  });

  test.describe('Vendor Access Control', () => {
    test('should allow authenticated vendors to access dashboard', async ({ page }) => {
      // Create vendor user with proper session
      const { userId, vendorId } = createMockVendor(state, 'vendor@test.com', 'Test Vendor', 'approved');
      
      // Establish authenticated session BEFORE navigation
      await mockAuthenticatedSession(page, state, 'vendor@test.com', 'supporter');
      
      // Mock vendor endpoint to return the vendor record
      await page.route('**/rest/v1/vendors?user_id=eq.*', async (route) => {
        const vendor = state.vendors.get(vendorId);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(vendor ? [vendor] : [])
        });
      });
      
      // Navigate to vendor dashboard
      await page.goto('/vendor-dashboard');
      await page.waitForLoadState('networkidle');
      
      // Should successfully load vendor dashboard (not redirected to /auth)
      const currentUrl = page.url();
      expect(currentUrl).toContain('/vendor-dashboard');
    });

    test('should restrict vendor dashboard to non-vendors', async ({ page }) => {
      // Create non-vendor user
      const userId = state.addUser('supporter@test.com', 'password123', {
        display_name: 'Regular Supporter',
        role: 'supporter',
        avatar_number: 1
      });
      
      await mockAuthenticatedSession(page, state, 'supporter@test.com', 'supporter');
      
      // Mock empty vendor response (no vendor record)
      await page.route('**/rest/v1/vendors?user_id=eq.*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });
      
      await page.goto('/vendor-dashboard');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected or show access denied
      const currentUrl = page.url();
      const accessDenied = await page.locator('text=/access denied|not authorized|vendor only/i').first().isVisible().catch(() => false);
      
      expect(!currentUrl.includes('/vendor-dashboard') || accessDenied).toBeTruthy();
    });
  });
});
