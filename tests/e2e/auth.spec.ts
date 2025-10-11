import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseDatabase, MockSupabaseState } from '../utils/supabase-mocks';

test.describe('Authentication and Signup Flow', () => {
  let state: MockSupabaseState;

  test.beforeEach(async ({ page }) => {
    state = new MockSupabaseState();
    await mockSupabaseAuth(page, state);
    await mockSupabaseDatabase(page, state);
    await page.goto('/auth');
  });

  test('should display auth page elements', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /sign in|log in|welcome/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('should toggle between sign-in and sign-up modes', async ({ page }) => {
    const toggleButton = page.locator('button').filter({ hasText: /sign up|create account|register/i }).first();
    await expect(toggleButton).toBeVisible();
    
    await toggleButton.click();
    await expect(page.locator('text=/sign up|create account|register/i')).toBeVisible();
  });

  test.describe('Signup Flow - Supporter Role', () => {
    test('should validate required fields', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      
      // Try to submit without filling fields
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      await submitButton.click();
      
      // Check that form prevents submission (button stays enabled or error shown)
      const emailInput = page.getByPlaceholder(/email/i);
      await expect(emailInput).toBeVisible();
      
      // Verify email field is required by checking if it's marked as invalid or has error
      const isRequired = await emailInput.getAttribute('required');
      expect(isRequired).toBeTruthy();
    });

    test('should successfully sign up as Supporter', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      
      // Fill in all required fields
      await page.getByPlaceholder(/email/i).fill('supporter@test.com');
      await page.getByPlaceholder(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Supporter');
      
      // Select supporter role
      const roleSelector = page.locator('select, [role="combobox"]').filter({ hasText: /role|i want to/i }).first();
      if (await roleSelector.isVisible()) {
        await roleSelector.click();
        await page.locator('text=/supporter|support/i').first().click();
      }
      
      // Accept terms
      const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /terms|privacy|agree/i }).first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      await submitButton.click();
      
      // Wait for redirect or success
      await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
      
      // Verify user was created in state
      const user = state.getUserByEmail('supporter@test.com');
      expect(user).toBeTruthy();
      expect(user?.email).toBe('supporter@test.com');
      
      // Verify profile was created
      const profile = state.profiles.get(user!.id);
      expect(profile).toBeTruthy();
      expect(profile?.display_name).toBe('Test Supporter');
      
      // Verify role was assigned
      const roles = Array.from(state.userRoles.values()).filter(r => r.user_id === user!.id);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0]?.role).toBe('supporter');
    });
  });

  test.describe('Signup Flow - Bestie Role', () => {
    test('should generate friend code for Bestie role', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      
      // Fill in required fields
      await page.getByPlaceholder(/email/i).fill('bestie@test.com');
      await page.getByPlaceholder(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Bestie');
      
      // Select bestie role
      const roleSelector = page.locator('select, [role="combobox"]').filter({ hasText: /role|i want to/i }).first();
      if (await roleSelector.isVisible()) {
        await roleSelector.click();
        await page.locator('text=/bestie|member with/i').first().click();
      }
      
      // Accept terms
      const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /terms|privacy|agree/i }).first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      await submitButton.click();
      
      // Wait for processing
      await page.waitForTimeout(1000);
      
      // Verify user was created with friend code
      const user = state.getUserByEmail('bestie@test.com');
      expect(user).toBeTruthy();
      
      const profile = state.profiles.get(user!.id);
      expect(profile).toBeTruthy();
      expect(profile?.friend_code).toBeTruthy();
      expect(profile?.friend_code.length).toBeGreaterThan(0);
      
      // Verify role is bestie
      const roles = Array.from(state.userRoles.values()).filter(r => r.user_id === user!.id);
      expect(roles[0]?.role).toBe('bestie');
    });
  });

  test.describe('Signup Flow - Caregiver Role', () => {
    test('should successfully sign up as Caregiver', async ({ page }) => {
      // Switch to signup mode
      await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
      
      // Fill in required fields
      await page.getByPlaceholder(/email/i).fill('caregiver@test.com');
      await page.getByPlaceholder(/password/i).fill('TestPass123!');
      await page.getByPlaceholder(/name|display name/i).fill('Test Caregiver');
      
      // Select caregiver role
      const roleSelector = page.locator('select, [role="combobox"]').filter({ hasText: /role|i want to/i }).first();
      if (await roleSelector.isVisible()) {
        await roleSelector.click();
        await page.locator('text=/caregiver|guardian|family/i').first().click();
      }
      
      // Accept terms
      const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /terms|privacy|agree/i }).first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
      await submitButton.click();
      
      // Wait for processing
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
    
    // Fill in required fields
    await page.getByPlaceholder(/email/i).fill('test@test.com');
    await page.getByPlaceholder(/password/i).fill('TestPass123!');
    await page.getByPlaceholder(/name|display name/i).fill('Test User');
    
    // Don't check terms checkbox
    const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /terms|privacy|agree/i }).first();
    if (await termsCheckbox.isVisible()) {
      await expect(termsCheckbox).not.toBeChecked();
    }
    
    // Try to submit
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign up|create account|register/i }).first();
    const initialUserCount = state.users.size;
    
    await submitButton.click();
    await page.waitForTimeout(500);
    
    // Verify no user was created
    expect(state.users.size).toBe(initialUserCount);
  });

  test('should allow avatar selection', async ({ page }) => {
    // Switch to signup mode
    await page.locator('button').filter({ hasText: /sign up|create account|register/i }).first().click();
    
    // Look for avatar selector
    const avatarSection = page.locator('text=/avatar|choose.*icon|select.*picture/i').first();
    
    if (await avatarSection.isVisible()) {
      // Click on an avatar option
      const avatarOption = page.locator('[role="radio"], img, button').filter({ hasText: /avatar/i }).first();
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
      }
    }
    
    // Verify avatar selection is available
    await expect(page.locator('text=/avatar|icon|picture/i').first()).toBeVisible();
  });

  test.describe('Sign In Flow', () => {
    test('should validate empty form', async ({ page }) => {
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      await signInButton.click();
      
      // Verify form has required validation
      const emailInput = page.getByPlaceholder(/email/i);
      const isRequired = await emailInput.getAttribute('required');
      expect(isRequired).toBeTruthy();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.getByPlaceholder(/email/i).fill('invalid@example.com');
      await page.getByPlaceholder(/password/i).fill('wrongpassword');
      
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      await signInButton.click();
      
      // Wait for error message
      await page.waitForTimeout(1000);
      
      // Verify error is shown (either via toast or inline message)
      const errorVisible = await page.locator('text=/invalid|incorrect|wrong/i').first().isVisible().catch(() => false);
      expect(errorVisible).toBeTruthy();
    });

    test('should successfully sign in with valid credentials', async ({ page }) => {
      // First create a user
      const userId = state.addUser('existing@test.com', 'password123', {
        display_name: 'Existing User',
        role: 'supporter',
        avatar_number: 1
      });
      
      // Now try to sign in
      await page.getByPlaceholder(/email/i).fill('existing@test.com');
      await page.getByPlaceholder(/password/i).fill('password123');
      
      const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|log in/i }).first();
      await signInButton.click();
      
      // Wait for redirect
      await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
      
      // Verify we're no longer on auth page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth');
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
      
      // Try to visit auth page
      await page.goto('/auth');
      
      // Should redirect away from auth page
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      
      // Either redirected or shows logout option
      const hasLogoutOption = await page.locator('text=/sign out|log out/i').first().isVisible().catch(() => false);
      expect(currentUrl.includes('/auth') === false || hasLogoutOption).toBeTruthy();
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should display forgot password link', async ({ page }) => {
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await expect(forgotPasswordLink).toBeVisible();
    });

    test('should show password reset form', async ({ page }) => {
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await forgotPasswordLink.click();
      
      // Should show email input for reset
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });

    test('should handle password reset request', async ({ page }) => {
      const forgotPasswordLink = page.locator('a, button').filter({ hasText: /forgot.*password|reset.*password/i }).first();
      await forgotPasswordLink.click();
      
      await page.getByPlaceholder(/email/i).fill('reset@test.com');
      
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /reset|send/i }).first();
      await submitButton.click();
      
      // Should show success message
      await page.waitForTimeout(1000);
      const successVisible = await page.locator('text=/sent|check.*email|link/i').first().isVisible().catch(() => false);
      expect(successVisible).toBeTruthy();
    });
  });
});
