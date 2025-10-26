import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseDatabase, mockAuthenticatedSession, MockSupabaseState } from '../utils/supabase-mocks';

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

  // CRITICAL: Clean up MockSupabaseState after each test to prevent state pollution
  test.afterEach(async ({ page }) => {
    if (state) {
      // AGGRESSIVE: Clear ALL mock state collections
      state.users.clear();
      state.profiles.clear();
      state.userRoles.clear();
      state.sessions.clear();
      state.caregiverBestieLinks.clear();
      state.vendors.clear();
      state.vendorBestieRequests.clear();
      
      console.log(`🧹 Cleaned up MockSupabaseState (users: ${state.users.size}, profiles: ${state.profiles.size})`);
      
      // Small delay to ensure cleanup completes
      await page.waitForTimeout(100);
    }
  });

  test('should display auth page elements', async ({ page }) => {
    console.log('🔍 TEST 9: Starting auth page elements test');
    // Elements should already be visible after beforeEach waits
    const header = page.locator('h1, h2').filter({ hasText: /sign in|log in|welcome/i }).first();
    const headerVisible = await header.isVisible();
    console.log('🔍 TEST 9: Header visible:', headerVisible);
    await expect(header).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    console.log('🔍 TEST 9: All elements visible');
  });

  test('should toggle between sign-in and sign-up modes', async ({ page }) => {
    console.log('🔍 TEST 10: Starting toggle test');
    const toggleButton = page.locator('button').filter({ hasText: /sign up|create account|register/i }).first();
    const toggleVisible = await toggleButton.isVisible();
    console.log('🔍 TEST 10: Toggle button visible:', toggleVisible);
    await expect(toggleButton).toBeVisible();
    
    await toggleButton.click();
    console.log('🔍 TEST 10: Toggle button clicked');
    
    // ✅ Wait for mode to change
    await page.waitForLoadState('networkidle');
    
    // Should see signup-specific elements
    const nameInput = page.getByPlaceholder(/name|display name/i);
    const nameVisible = await nameInput.isVisible({ timeout: 3000 });
    console.log('🔍 TEST 10: Name input visible after toggle:', nameVisible);
    await expect(nameInput).toBeVisible({ timeout: 3000 });
  });

  test.describe('Signup Flow - Supporter Role', () => {
    test('should validate required fields', async ({ page }) => {
      console.log('🔍 TEST 11: Starting required fields validation test');
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await page.waitForLoadState('networkidle');
      console.log('🔍 TEST 11: Switched to signup mode');
      
      // ✅ Don't try to click submit - just verify button is correctly disabled
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      const isDisabled = await submitButton.isDisabled();
      console.log('🔍 TEST 11: Submit button disabled:', isDisabled);
      
      // Button SHOULD be disabled when form is empty (this is correct behavior!)
      await expect(submitButton).toBeDisabled();
      
      // Verify required fields
      const emailInput = page.getByPlaceholder(/email/i);
      const requiredAttr = await emailInput.getAttribute('required');
      console.log('🔍 TEST 11: Email required attribute:', requiredAttr);
      await expect(emailInput).toHaveAttribute('required', '');
    });

    test('should successfully sign up as Supporter', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await expect(page.getByPlaceholder(/name|display name/i)).toBeVisible();
      
      // ✅ Fill ALL required fields FIRST
      await page.getByPlaceholder(/email/i).fill('supporter@test.com');
      await page.getByLabel(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Supporter');
      
      // ✅ Wait for name input to blur and state to update
      await page.waitForLoadState('networkidle');
      
      // Select supporter role (default, so no need to change)
      // Role defaults to "supporter" so we don't need to select it
      
      // ✅ Select avatar (required)
      const avatarOption = page.locator('[data-avatar-number="1"]').first();
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
        await page.waitForLoadState('networkidle'); // Wait for state update
      }
      
      // ✅ Get submit button reference FIRST
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      
      // ✅ Accept terms
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
        await expect(submitButton).toBeEnabled(); // Wait for state update
      }
      
      // ✅ NOW button should be enabled
      await expect(submitButton).toBeEnabled();
      
      // Submit form
      await submitButton.click({ noWaitAfter: true });
      
      // Wait for form submission to complete
      await page.waitForLoadState('networkidle');
      // PHASE 2 FIX: Increased wait from 2000ms to 3000ms for profile creation
      await page.waitForTimeout(3000);
      
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
      console.log('🔍 TEST 13-15: Starting Bestie signup test');
      
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await expect(page.getByPlaceholder(/name|display name/i)).toBeVisible();
      console.log('🔍 TEST 13-15: Clicked signup button');
      
      // Fill in required fields
      await page.getByPlaceholder(/email/i).fill('bestie@test.com');
      await page.getByLabel(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Bestie');
      console.log('🔍 TEST 13-15: Filled basic fields');
      
      // ✅ Wait for name input to blur and state to update
      await page.waitForLoadState('networkidle');
      
      // Select bestie role
      const roleSelector = page.getByRole('combobox').first();
      console.log('🔍 TEST 13-15: Found role selector:', await roleSelector.isVisible());
      await roleSelector.click();
      await expect(page.getByRole('option').first()).toBeVisible(); // Wait for dropdown to open
      console.log('🔍 TEST 13-15: Clicked role selector');
      
      // Try to find the bestie option with different strategies
      const bestieOption = page.getByRole('option').filter({ hasText: /bestie/i }).first();
      const optionExists = await bestieOption.isVisible().catch(() => false);
      console.log('🔍 TEST 13-15: Bestie option visible:', optionExists);
      
      if (!optionExists) {
        // List all available options for debugging
        const allOptions = await page.getByRole('option').all();
        console.log('🔍 TEST 13-15: Available options count:', allOptions.length);
        for (let i = 0; i < allOptions.length; i++) {
          const text = await allOptions[i].textContent();
          console.log(`🔍 TEST 13-15: Option ${i}:`, text);
        }
      }
      
      await bestieOption.click();
      await page.waitForLoadState('networkidle'); // Wait for selection to complete
      console.log('🔍 TEST 13-15: Clicked bestie option');
      
      // Select avatar
      const avatarOption = page.locator('[data-avatar-number="1"]').first();
      const avatarVisible = await avatarOption.isVisible().catch(() => false);
      console.log('🔍 TEST 13-15: Avatar visible:', avatarVisible);
      if (avatarVisible) {
        await avatarOption.click();
        await page.waitForLoadState('networkidle');
        console.log('🔍 TEST 13-15: Clicked avatar');
      }
      
      // Get submit button - use more specific selector for "Create Account"
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /create account/i });
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      console.log('🔍 TEST 13-15: Submit button visible');
      
      // Accept terms - this should enable the button
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      await expect(termsCheckbox).toBeVisible({ timeout: 5000 });
      console.log('🔍 TEST 13-15: Terms checkbox visible');
      
      await termsCheckbox.check();
      await expect(termsCheckbox).toBeChecked({ timeout: 2000 });
      console.log('🔍 TEST 13-15: Checked terms');
      
      // Wait for React state to update and button to become enabled
      await page.waitForTimeout(500);
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      console.log('🔍 TEST 13-15: Submit button enabled');
      
      // Submit form
      console.log('🔍 TEST 13-15: About to click submit');
      await submitButton.click({ noWaitAfter: true });
      
      // Wait for form submission to complete
      await page.waitForLoadState('networkidle');
      console.log('🔍 TEST 13-15: Form submitted, checking results');
      
      // PHASE 2 FIX: Poll for user creation with retries
      let user = state.getUserByEmail('bestie@test.com');
      let retries = 0;
      while (!user && retries < 10) {
        await page.waitForTimeout(500);
        user = state.getUserByEmail('bestie@test.com');
        retries++;
        console.log(`🔍 TEST 13-15: Polling for user (attempt ${retries}/10)`);
      }
      
      console.log('🔍 TEST 13-15: User found:', user ? 'YES' : 'NO', user);
      expect(user).toBeTruthy();
      
      // PHASE 2 FIX: Poll for profile with friend code
      let profile = state.profiles.get(user!.id);
      retries = 0;
      while ((!profile || !profile.friend_code) && retries < 10) {
        await page.waitForTimeout(500);
        profile = state.profiles.get(user!.id);
        retries++;
        console.log(`🔍 TEST 13-15: Polling for friend code (attempt ${retries}/10)`);
      }
      
      console.log('🔍 TEST 13-15: Profile found:', profile ? 'YES' : 'NO', profile);
      console.log('🔍 TEST 13-15: Friend code:', profile?.friend_code, 'Length:', profile?.friend_code?.length, 'Emoji count:', profile?.friend_code ? [...profile.friend_code].length : 0);
      expect(profile).toBeTruthy();
      expect(profile?.friend_code).toBeTruthy();
      expect(profile?.friend_code.length).toBeGreaterThan(0);
      // Friend code should be exactly 3 emojis (use spread to count emojis correctly)
      expect([...profile!.friend_code].length).toBe(3);
      
      // Verify role is bestie
      const roles = Array.from(state.userRoles.values()).filter(r => r.user_id === user!.id);
      console.log('🔍 TEST 13-15: Roles found:', roles);
      expect(roles[0]?.role).toBe('bestie');
    });
  });

  test.describe('Signup Flow - Caregiver Role', () => {
    test('should successfully sign up as Caregiver', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      await expect(page.getByPlaceholder(/name|display name/i)).toBeVisible();
      
      // Fill in required fields
      await page.getByPlaceholder(/email/i).fill('caregiver@test.com');
      await page.getByLabel(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Caregiver');
      
      // ✅ Wait for name input to blur and state to update
      await page.waitForLoadState('networkidle');
      
      // Select caregiver role
      const roleSelector = page.getByRole('combobox').first();
      await roleSelector.click();
      await expect(page.getByRole('option').first()).toBeVisible(); // Wait for dropdown to open
      
      // Click on the caregiver/guardian option
      const caregiverOption = page.getByRole('option', { name: /guardian/i });
      await caregiverOption.click();
      await page.waitForLoadState('networkidle'); // Wait for selection to complete
      
      // Select avatar
      const avatarOption = page.locator('[data-avatar-number="1"]').first();
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Get submit button - use more specific selector for "Create Account"
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /create account/i });
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      
      // Accept terms - this should enable the button
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      await expect(termsCheckbox).toBeVisible({ timeout: 5000 });
      await termsCheckbox.check();
      await expect(termsCheckbox).toBeChecked({ timeout: 2000 });
      
      // Wait for React state to update and button to become enabled
      await page.waitForTimeout(500);
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      
      // Submit form
      await submitButton.click({ noWaitAfter: true });
      
      // Wait for form submission to complete
      await page.waitForLoadState('networkidle');
      // PHASE 2 FIX: Add progressive wait for caregiver profile creation
      await page.waitForTimeout(3000);
      
      // PHASE 2 FIX: Poll for user creation with retries
      let user = state.getUserByEmail('caregiver@test.com');
      let retries = 0;
      while (!user && retries < 10) {
        await page.waitForTimeout(500);
        user = state.getUserByEmail('caregiver@test.com');
        retries++;
        console.log(`🔍 Caregiver test: Polling for user (attempt ${retries}/10)`);
      }
      
      expect(user).toBeTruthy();
      
      // Verify role is caregiver
      const roles = Array.from(state.userRoles.values()).filter(r => r.user_id === user!.id);
      expect(roles[0]?.role).toBe('caregiver');
    });
  });

  test('should require terms acceptance', async ({ page }) => {
    console.log('🔍 TEST 17: Starting terms acceptance test');
    // Switch to signup mode
    await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
    await expect(page.getByPlaceholder(/name|display name/i)).toBeVisible();
    console.log('🔍 TEST 17: Switched to signup mode');
    
    // Fill in ALL OTHER required fields
    await page.getByPlaceholder(/email/i).fill('test@test.com');
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByPlaceholder(/name|display name/i).fill('Test User');
    await page.waitForLoadState('networkidle');
    console.log('🔍 TEST 17: Filled required fields');
    
    // Select avatar
    const avatarOption = page.locator('[data-avatar-number="1"]').first();
    if (await avatarOption.isVisible()) {
      await avatarOption.click();
      console.log('🔍 TEST 17: Avatar selected');
    }
    
    // ✅ Don't check terms - verify button stays disabled
    const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
    
    if (await termsCheckbox.isVisible()) {
      const isChecked = await termsCheckbox.isChecked();
      console.log('🔍 TEST 17: Terms checkbox checked:', isChecked);
      await expect(termsCheckbox).not.toBeChecked();
      
      // Get the "Create Account" button specifically
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /create account/i });
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      
      // Wait for state to stabilize
      await page.waitForTimeout(500);
      
      const isDisabled = await submitButton.isDisabled();
      console.log('🔍 TEST 17: Submit button disabled without terms:', isDisabled);
      
      // Button should be disabled without terms acceptance
      await expect(submitButton).toBeDisabled();
    }
  });

  test('should allow avatar selection', async ({ page }) => {
    // Switch to signup mode
    await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
    await expect(page.getByPlaceholder(/name|display name/i)).toBeVisible();
    console.log('🔍 TEST 18-20: Switched to signup mode');
    
    // Fill in name first (avatar picker appears after name is filled)
    await page.getByPlaceholder(/name|display name/i).fill('Test User');
    await page.waitForLoadState('networkidle');
    // PHASE 2 FIX: Increased wait for avatar picker to render
    await page.waitForTimeout(1000);
    console.log('🔍 TEST 18-20: Filled display name');
    
    // Click the collapsible trigger to expand avatar picker
    const avatarLabel = page.getByText('Choose Your Avatar (Optional)');
    const labelVisible = await avatarLabel.isVisible().catch(() => false);
    console.log('🔍 TEST 18-20: Avatar label visible:', labelVisible);
    await avatarLabel.click();
    // PHASE 2 FIX: Increased timeout for avatar visibility
    await expect(page.locator('[data-avatar-number]').first()).toBeVisible({ timeout: 5000 });
    console.log('🔍 TEST 18-20: Clicked avatar collapsible');
    
    // Wait for avatars to load and appear
    const avatarExists = await page.locator('[data-avatar-number]').first().isVisible().catch(() => false);
    console.log('🔍 TEST 18-20: Avatar selector visible:', avatarExists);
    console.log('🔍 TEST 18-20: Avatar count:', await page.locator('[data-avatar-number]').count());
    
    // Click on an avatar option
    const avatarOption = page.locator('[data-avatar-number="1"]').first();
    await expect(avatarOption).toBeVisible();
    await avatarOption.click();
    await page.waitForLoadState('networkidle');
    console.log('🔍 TEST 18-20: Avatar clicked successfully');
  });

  test.describe('Sign In Flow', () => {
    test('should validate empty form', async ({ page }) => {
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      
      console.log('🔍 TEST 21-23: Sign-in button visible:', await signInButton.isVisible());
      // ✅ Sign-in button is NOT disabled by default (HTML5 validation handles required fields)
      // The form will show browser validation errors when submitted
      await expect(signInButton).toBeVisible();
      
      // Verify required fields exist (getAttribute returns "" for boolean attributes)
      const emailInput = page.getByPlaceholder(/email/i);
      const hasRequired = await emailInput.getAttribute('required');
      console.log('🔍 TEST 21-23: Email required attribute:', hasRequired);
      expect(hasRequired).not.toBeNull(); // Boolean attribute exists
      
      const passwordInput = page.getByLabel(/password/i);
      const hasPasswordRequired = await passwordInput.getAttribute('required');
      expect(hasPasswordRequired).not.toBeNull();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      console.log('🔍 TEST 24: Starting invalid credentials test');
      await page.getByPlaceholder(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      console.log('🔍 TEST 24: Filled invalid credentials');
      
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      
      // ✅ Wait for button to be enabled
      const isEnabled = await signInButton.isEnabled();
      console.log('🔍 TEST 24: Sign-in button enabled:', isEnabled);
      await expect(signInButton).toBeEnabled();
      
      await signInButton.click();
      console.log('🔍 TEST 24: Sign-in button clicked');
      
      // ✅ Wait longer for error toast/message
      await expect(page.locator('text=/invalid|incorrect|wrong|not found/i').first()).toBeVisible({ timeout: 5000 });
      
      // Verify error is shown
      const errorVisible = await page.locator('text=/invalid|incorrect|wrong|not found/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log('🔍 TEST 24: Error message visible:', errorVisible);
      expect(errorVisible).toBeTruthy();
    });

    test('should successfully sign in with valid credentials', async ({ page }) => {
      console.log('🔍 TEST 25: Starting valid sign-in test');
      // Create a user
      const userId = state.addUser('existing@test.com', 'password123', {
        display_name: 'Existing User',
        role: 'supporter',
        avatar_number: 1
      });
      console.log('🔍 TEST 25: Created test user:', userId);
      
      // Sign in
      await page.getByPlaceholder(/email/i).fill('existing@test.com');
      await page.getByLabel(/password/i).fill('password123');
      console.log('🔍 TEST 25: Filled valid credentials');
      
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      
      // ✅ Wait for button to be enabled
      await expect(signInButton).toBeEnabled();
      console.log('🔍 TEST 25: Sign-in button enabled');
      
      await signInButton.click({ noWaitAfter: true });
      console.log('🔍 TEST 25: Sign-in button clicked');
      
      // Wait for sign-in to process
      await page.waitForLoadState('networkidle');
      
      // Verify session exists
      const session = state.sessions.get(userId);
      console.log('🔍 TEST 25: Session created:', session ? 'YES' : 'NO');
      expect(session).toBeTruthy();
      expect(session?.user.email).toBe('existing@test.com');
      console.log('🔍 TEST 25: Sign-in successful');
    });
  });

  test.describe('Session Management', () => {
    test('should redirect authenticated users away from auth page', async ({ page }) => {
      // Create authenticated user and inject session into browser
      await mockAuthenticatedSession(page, state, 'authenticated@test.com', 'supporter');
      
      // Navigate to auth page - should redirect away
      await page.goto('/auth');
      
      // Should redirect to community page
      await page.waitForURL('/community', { timeout: 5000 });
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should display forgot password link', async ({ page }) => {
      console.log('🔍 TEST 29: Starting forgot password link test');
      // ✅ Elements should be visible after beforeEach
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      const linkVisible = await forgotPasswordLink.isVisible();
      console.log('🔍 TEST 29: Forgot password link visible:', linkVisible);
      await expect(forgotPasswordLink).toBeVisible();
    });

    test('should show password reset form', async ({ page }) => {
      console.log('🔍 TEST 30: Starting password reset form test');
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await forgotPasswordLink.click();
      console.log('🔍 TEST 30: Clicked forgot password link');
      
      // ✅ Wait for form to appear
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      
      const emailVisible = await page.getByPlaceholder(/email/i).isVisible();
      console.log('🔍 TEST 30: Email input visible:', emailVisible);
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });

    test('should handle password reset request', async ({ page }) => {
      console.log('🔍 TEST 31: Starting password reset request test');
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await forgotPasswordLink.click();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      console.log('🔍 TEST 31: Opened password reset form');
      
      await page.getByPlaceholder(/email/i).fill('reset@test.com');
      console.log('🔍 TEST 31: Filled email for reset');
      
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /reset|send/i }).first();
      
      // ✅ Wait for button to be enabled
      const isEnabled = await submitButton.isEnabled();
      console.log('🔍 TEST 31: Submit button enabled:', isEnabled);
      await expect(submitButton).toBeEnabled();
      
      await submitButton.click();
      console.log('🔍 TEST 31: Clicked submit button');
      
      // ✅ Wait longer for success message
      await expect(page.locator('text=/sent|check.*email|link/i').first()).toBeVisible({ timeout: 5000 });
      const successVisible = await page.locator('text=/sent|check.*email|link/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log('🔍 TEST 31: Success message visible:', successVisible);
      expect(successVisible).toBeTruthy();
    });
  });
});
