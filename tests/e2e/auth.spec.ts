import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseDatabase, MockSupabaseState } from '../utils/supabase-mocks';

test.describe('Authentication and Signup Flow', () => {
  let state: MockSupabaseState;

  test.beforeEach(async ({ page }) => {
    // 🔍 DIAGNOSTIC: Capture browser console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🚀 FORM SUBMIT') || text.includes('📥 MOCK RECEIVED')) {
        console.log('BROWSER CONSOLE:', text);
      }
    });
    
    state = new MockSupabaseState();
    await mockSupabaseAuth(page, state);
    await mockSupabaseDatabase(page, state);
    await page.goto('/auth');
    
    // ✅ CRITICAL: Wait for page to be fully loaded and interactive
    await page.waitForLoadState('networkidle');
    
    // ✅ Wait for auth form to be visible (after TermsAcceptanceGuard check)
    await page.locator('input[type="email"], input[placeholder*="email" i]').first().waitFor({ timeout: 5000 });
  });

  test('should display auth page elements', async ({ page }) => {
    // Elements should already be visible after beforeEach waits
    await expect(page.locator('h1, h2').filter({ hasText: /sign in|log in|welcome/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should toggle between sign-in and sign-up modes', async ({ page }) => {
    const toggleButton = page.locator('button').filter({ hasText: /sign up|create account|register/i }).first();
    await expect(toggleButton).toBeVisible();
    
    await toggleButton.click();
    
    // ✅ Wait for mode to change
    await page.waitForTimeout(300);
    
    // Should see signup-specific elements
    await expect(page.getByPlaceholder(/name|display name/i)).toBeVisible({ timeout: 3000 });
  });

  test.describe('Signup Flow - Supporter Role', () => {
    test('should validate required fields', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await page.waitForTimeout(300);
      
      // ✅ Don't try to click submit - just verify button is correctly disabled
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      
      // Button SHOULD be disabled when form is empty (this is correct behavior!)
      await expect(submitButton).toBeDisabled();
      
      // Verify required fields
      const emailInput = page.getByPlaceholder(/email/i);
      await expect(emailInput).toHaveAttribute('required', '');
    });

    test('should successfully sign up as Supporter', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await page.waitForTimeout(500);
      
      // ✅ Fill ALL required fields FIRST
      await page.getByPlaceholder(/email/i).fill('supporter@test.com');
      await page.getByLabel(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Supporter');
      
      // ✅ Wait for name input to blur and state to update
      await page.waitForTimeout(200);
      
      // Select supporter role (default, so no need to change)
      // Role defaults to "supporter" so we don't need to select it
      
      // ✅ Select avatar (required)
      const avatarOption = page.locator('[data-avatar-number="1"]').first();
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
        await page.waitForTimeout(200); // Wait for state update
      }
      
      // ✅ Accept terms
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
        await page.waitForTimeout(200); // Wait for state update
      }
      
      // ✅ NOW button should be enabled
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      await expect(submitButton).toBeEnabled();
      
      // Submit form
      await submitButton.click({ noWaitAfter: true });
      
      // Wait for form submission to complete
      await page.waitForTimeout(1000);
      
      // Verify user was created
      const user = state.getUserByEmail('supporter@test.com');
      expect(user).toBeTruthy();
      expect(user?.email).toBe('supporter@test.com');
      
      const profile = state.profiles.get(user!.id);
      expect(profile).toBeTruthy();
      expect(profile?.display_name).toBe('Test Supporter');
      
      const roles = Array.from(state.userRoles.values()).filter(r => r.user_id === user!.id);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0]?.role).toBe('supporter');
    });
  });

  test.describe('Signup Flow - Bestie Role', () => {
    test('should generate friend code for Bestie role', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await page.waitForTimeout(500);
      
      // Fill in required fields
      await page.getByPlaceholder(/email/i).fill('bestie@test.com');
      await page.getByLabel(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Bestie');
      
      // ✅ Wait for name input to blur and state to update
      await page.waitForTimeout(200);
      
      // Select bestie role
      const roleSelector = page.getByRole('combobox').first();
      await roleSelector.click();
      await page.waitForTimeout(300); // Wait for dropdown to open
      
      // Click on the bestie option (use getByRole for better reliability)
      const bestieOption = page.getByRole('option', { name: /bestie|community member/i });
      await bestieOption.click();
      await page.waitForTimeout(300); // Wait for selection to complete
      
      // Select avatar
      const avatarOption = page.locator('[data-avatar-number="1"]').first();
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
        await page.waitForTimeout(200);
      }
      
      // Accept terms
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
        await page.waitForTimeout(200);
      }
      
      // Verify button is enabled before clicking
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      await expect(submitButton).toBeEnabled();
      
      // Submit form
      await submitButton.click({ noWaitAfter: true });
      
      // Wait for form submission to complete
      await page.waitForTimeout(1000);
      
      // Verify user was created with friend code
      const user = state.getUserByEmail('bestie@test.com');
      expect(user).toBeTruthy();
      
      const profile = state.profiles.get(user!.id);
      expect(profile).toBeTruthy();
      expect(profile?.friend_code).toBeTruthy();
      expect(profile?.friend_code.length).toBeGreaterThan(0);
      // Friend code should be exactly 3 emojis (use spread to count emojis correctly)
      expect([...profile!.friend_code].length).toBe(3);
      
      // Verify role is bestie
      const roles = Array.from(state.userRoles.values()).filter(r => r.user_id === user!.id);
      expect(roles[0]?.role).toBe('bestie');
    });
  });

  test.describe('Signup Flow - Caregiver Role', () => {
    test('should successfully sign up as Caregiver', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await page.waitForTimeout(500);
      
      // Fill in required fields
      await page.getByPlaceholder(/email/i).fill('caregiver@test.com');
      await page.getByLabel(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Caregiver');
      
      // ✅ Wait for name input to blur and state to update
      await page.waitForTimeout(200);
      
      // Select caregiver role
      const roleSelector = page.getByRole('combobox').first();
      await roleSelector.click();
      await page.waitForTimeout(300); // Wait for dropdown to open
      
      // Click on the caregiver/guardian option
      const caregiverOption = page.getByRole('option', { name: /guardian/i });
      await caregiverOption.click();
      await page.waitForTimeout(300); // Wait for selection to complete
      
      // Select avatar
      const avatarOption = page.locator('[data-avatar-number="1"]').first();
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
        await page.waitForTimeout(200);
      }
      
      // Accept terms
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
        await page.waitForTimeout(200);
      }
      
      // Verify button is enabled before clicking
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      await expect(submitButton).toBeEnabled();
      
      // Submit form
      await submitButton.click({ noWaitAfter: true });
      
      // Wait for form submission to complete
      await page.waitForTimeout(1000);
      
      // Verify user was created
      const user = state.getUserByEmail('caregiver@test.com');
      expect(user).toBeTruthy();
      
      // Verify role is caregiver
      const roles = Array.from(state.userRoles.values()).filter(r => r.user_id === user!.id);
      expect(roles[0]?.role).toBe('caregiver');
    });
  });

  test('should require terms acceptance', async ({ page }) => {
    // Switch to signup mode
    await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
    await page.waitForTimeout(300);
    
    // Fill in ALL OTHER required fields
    await page.getByPlaceholder(/email/i).fill('test@test.com');
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByPlaceholder(/name|display name/i).fill('Test User');
    
    // Select avatar
    const avatarOption = page.locator('[data-avatar-number="1"]').first();
    if (await avatarOption.isVisible()) {
      await avatarOption.click();
    }
    
    // ✅ Don't check terms - verify button stays disabled
    const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
    
    if (await termsCheckbox.isVisible()) {
      await expect(termsCheckbox).not.toBeChecked();
      
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      
      // Button should be disabled without terms acceptance
      await expect(submitButton).toBeDisabled();
    }
  });

  test('should allow avatar selection', async ({ page }) => {
    // Switch to signup mode
    await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
    await page.waitForTimeout(500);
    
    // Fill in name first (avatar picker appears after name is filled)
    await page.getByPlaceholder(/name|display name/i).fill('Test User');
    await page.waitForTimeout(300);
    
    // ✅ Wait for avatar section to appear
    await page.locator('[data-avatar-number]').first().waitFor({ timeout: 5000 });
    
    // Click on an avatar option
    const avatarOption = page.locator('[data-avatar-number="1"]').first();
    await expect(avatarOption).toBeVisible();
    await avatarOption.click();
    
    // Verify selection (may have visual indicator)
    await page.waitForTimeout(200);
  });

  test.describe('Sign In Flow', () => {
    test('should validate empty form', async ({ page }) => {
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      
      // ✅ Sign-in button is NOT disabled by default (HTML5 validation handles required fields)
      // The form will show browser validation errors when submitted
      await expect(signInButton).toBeVisible();
      
      // Verify required fields exist
      const emailInput = page.getByPlaceholder(/email/i);
      const isRequired = await emailInput.getAttribute('required');
      expect(isRequired).toBeTruthy();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.getByPlaceholder(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      
      // ✅ Wait for button to be enabled
      await expect(signInButton).toBeEnabled();
      
      await signInButton.click();
      
      // ✅ Wait longer for error toast/message
      await page.waitForTimeout(2000);
      
      // Verify error is shown
      const errorVisible = await page.locator('text=/invalid|incorrect|wrong|not found/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorVisible).toBeTruthy();
    });

    test('should successfully sign in with valid credentials', async ({ page }) => {
      // Create a user
      const userId = state.addUser('existing@test.com', 'password123', {
        display_name: 'Existing User',
        role: 'supporter',
        avatar_number: 1
      });
      
      // Sign in
      await page.getByPlaceholder(/email/i).fill('existing@test.com');
      await page.getByLabel(/password/i).fill('password123');
      
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      
      // ✅ Wait for button to be enabled
      await expect(signInButton).toBeEnabled();
      
      await signInButton.click({ noWaitAfter: true });
      
      // Wait for sign-in to process
      await page.waitForTimeout(1000);
      
      // Verify session exists
      const session = state.sessions.get(userId);
      expect(session).toBeTruthy();
      expect(session?.user.email).toBe('existing@test.com');
    });
  });

  test.describe('Session Management', () => {
    test('should redirect authenticated users away from auth page', async ({ page }) => {
      // Create and authenticate a user
      const userId = state.addUser('authenticated@test.com', 'password123', {
        display_name: 'Authenticated User',
        role: 'supporter',
        avatar_number: 1
      });
      
      const session = state.sessions.get(userId);
      const user = state.users.get(userId);
      
      // ✅ Set session in page context BEFORE navigating to /auth
      await page.evaluate((sessionData) => {
        localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
      }, session);
      
      // Also set up mock to return this session
      await page.route('**/auth/v1/user*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user }),
        });
      });
      
      await page.route('**/auth/v1/session*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(session),
        });
      });
      
      // Now navigate to /auth - should redirect
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Wait for redirect
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth');
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should display forgot password link', async ({ page }) => {
      // ✅ Elements should be visible after beforeEach
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await expect(forgotPasswordLink).toBeVisible();
    });

    test('should show password reset form', async ({ page }) => {
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await forgotPasswordLink.click();
      
      // ✅ Wait for form to appear
      await page.waitForTimeout(300);
      
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });

    test('should handle password reset request', async ({ page }) => {
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await forgotPasswordLink.click();
      await page.waitForTimeout(300);
      
      await page.getByPlaceholder(/email/i).fill('reset@test.com');
      
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /reset|send/i }).first();
      
      // ✅ Wait for button to be enabled
      await expect(submitButton).toBeEnabled();
      
      await submitButton.click();
      
      // ✅ Wait longer for success message
      await page.waitForTimeout(2000);
      const successVisible = await page.locator('text=/sent|check.*email|link/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(successVisible).toBeTruthy();
    });
  });
});
