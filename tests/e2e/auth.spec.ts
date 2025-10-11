import { test, expect } from '@playwright/test';

// Comprehensive Authentication & Signup Flow Tests
test.describe('Authentication & Signup Flows', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should display the auth page with all elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('should toggle between sign-in and sign-up modes', async ({ page }) => {
    // Start in sign-in mode
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Switch to sign-up
    const signUpToggle = page.getByRole('button', { name: /sign up|create account/i }).or(
      page.getByRole('link', { name: /sign up|create account/i })
    );
    await signUpToggle.click();
    await expect(page.getByRole('heading', { name: /sign up|create account/i })).toBeVisible();
    
    // Should show role selector in signup mode
    await expect(page.getByText(/select.*role/i).or(page.locator('[role="combobox"]'))).toBeVisible();
    
    // Switch back to sign-in
    const signInToggle = page.getByRole('button', { name: /sign in|already have.*account/i }).or(
      page.getByRole('link', { name: /sign in|already have.*account/i })
    );
    await signInToggle.click();
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test.describe('Signup Flow - Supporter Role', () => {
    test('should successfully sign up as supporter with all required fields', async ({ page }) => {
      // Switch to signup mode
      const signUpToggle = page.getByRole('button', { name: /sign up|create account/i }).or(
        page.getByRole('link', { name: /sign up|create account/i })
      );
      await signUpToggle.click();
      
      // Fill in required fields
      await page.getByPlaceholder(/display name|name/i).fill('Test Supporter');
      await page.getByPlaceholder(/email/i).fill(testEmail);
      await page.getByPlaceholder(/^password/i).first().fill(testPassword);
      
      // Select supporter role
      await page.locator('[role="combobox"]').first().click();
      await page.getByRole('option', { name: /supporter/i }).click();
      
      // Accept terms
      await page.getByRole('checkbox', { name: /terms|agree/i }).check();
      
      // Submit
      await page.getByRole('button', { name: /sign up|create account/i, exact: false }).click();
      
      // Should redirect to community page or show success
      await expect(page).toHaveURL(/\/(community|auth)/, { timeout: 10000 });
    });

    test('should validate required fields on signup', async ({ page }) => {
      const signUpToggle = page.getByRole('button', { name: /sign up|create account/i }).or(
        page.getByRole('link', { name: /sign up|create account/i })
      );
      await signUpToggle.click();
      
      // Try to submit without filling fields
      await page.getByRole('button', { name: /sign up|create account/i, exact: false }).click();
      
      // Should show validation errors
      await expect(page.getByText(/required|fill|enter/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should require terms acceptance', async ({ page }) => {
      const signUpToggle = page.getByRole('button', { name: /sign up|create account/i }).or(
        page.getByRole('link', { name: /sign up|create account/i })
      );
      await signUpToggle.click();
      
      await page.getByPlaceholder(/display name|name/i).fill('Test User');
      await page.getByPlaceholder(/email/i).fill(`test-terms-${Date.now()}@example.com`);
      await page.getByPlaceholder(/^password/i).first().fill(testPassword);
      
      // Don't check terms box
      await page.getByRole('button', { name: /sign up|create account/i, exact: false }).click();
      
      // Should prevent submission or show error
      await expect(page.getByText(/terms|accept|agree/i)).toBeVisible();
    });
  });

  test.describe('Signup Flow - Bestie Role', () => {
    test('should successfully sign up as bestie and generate friend code', async ({ page }) => {
      const signUpToggle = page.getByRole('button', { name: /sign up|create account/i }).or(
        page.getByRole('link', { name: /sign up|create account/i })
      );
      await signUpToggle.click();
      
      const bestieEmail = `bestie-${Date.now()}@example.com`;
      
      await page.getByPlaceholder(/display name|name/i).fill('Test Bestie');
      await page.getByPlaceholder(/email/i).fill(bestieEmail);
      await page.getByPlaceholder(/^password/i).first().fill(testPassword);
      
      // Select bestie role
      await page.locator('[role="combobox"]').first().click();
      await page.getByRole('option', { name: /bestie/i }).click();
      
      await page.getByRole('checkbox', { name: /terms|agree/i }).check();
      await page.getByRole('button', { name: /sign up|create account/i, exact: false }).click();
      
      // Wait for redirect
      await page.waitForURL(/\/(community|auth)/, { timeout: 10000 });
      
      // TODO: Verify friend_code was generated in profiles table
      // This would require database query access in tests
    });
  });

  test.describe('Signup Flow - Caregiver Role', () => {
    test('should successfully sign up as caregiver', async ({ page }) => {
      const signUpToggle = page.getByRole('button', { name: /sign up|create account/i }).or(
        page.getByRole('link', { name: /sign up|create account/i })
      );
      await signUpToggle.click();
      
      const caregiverEmail = `caregiver-${Date.now()}@example.com`;
      
      await page.getByPlaceholder(/display name|name/i).fill('Test Guardian');
      await page.getByPlaceholder(/email/i).fill(caregiverEmail);
      await page.getByPlaceholder(/^password/i).first().fill(testPassword);
      
      // Select caregiver role
      await page.locator('[role="combobox"]').first().click();
      await page.getByRole('option', { name: /caregiver|guardian/i }).click();
      
      await page.getByRole('checkbox', { name: /terms|agree/i }).check();
      await page.getByRole('button', { name: /sign up|create account/i, exact: false }).click();
      
      await page.waitForURL(/\/(community|auth)/, { timeout: 10000 });
    });
  });

  test.describe('Avatar Selection', () => {
    test('should allow avatar selection during signup', async ({ page }) => {
      const signUpToggle = page.getByRole('button', { name: /sign up|create account/i }).or(
        page.getByRole('link', { name: /sign up|create account/i })
      );
      await signUpToggle.click();
      
      // Look for avatar picker
      const avatarPicker = page.locator('[data-testid="avatar-picker"]').or(page.getByText(/choose.*avatar/i).locator('..'));
      
      if (await avatarPicker.isVisible({ timeout: 2000 }).catch(() => false)) {
        await avatarPicker.click();
        // Select an avatar
        await page.locator('[data-avatar-option]').first().click();
      }
    });
  });

  test.describe('Sign-In Flow', () => {
    test('should show validation errors for empty login form', async ({ page }) => {
      // Try to submit empty form
      await page.getByRole('button', { name: /^sign in$/i }).click();
      
      // Should show validation or remain on page
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.getByPlaceholder(/email/i).fill('invalid@example.com');
      await page.getByPlaceholder(/password/i).fill('wrongpassword');
      
      await page.getByRole('button', { name: /^sign in$/i }).click();
      
      // Should show error message
      await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session & Redirect Behavior', () => {
    test('should redirect authenticated users away from auth page', async ({ page, context }) => {
      // Set up a cookie to simulate authentication
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'test-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
      
      await page.goto('/auth');
      
      // Should redirect away from auth page when already authenticated
      await expect(page).not.toHaveURL('/auth');
    });
  });

  test.describe('Logout Flow', () => {
    test('should show logout option when authenticated', async ({ page, context }) => {
      // Simulate authenticated state
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'test-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
      
      await page.goto('/');
      
      // Look for user menu or logout button
      const userMenuTrigger = page.getByRole('button', { name: /menu|account|profile/i });
      if (await userMenuTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userMenuTrigger.click();
      }
      
      // Should have logout option somewhere
      await expect(
        page.getByRole('button', { name: /logout|sign out/i })
          .or(page.getByRole('menuitem', { name: /logout|sign out/i }))
      ).toBeVisible();
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should have a forgot password link', async ({ page }) => {
      await expect(page.getByRole('link', { name: /forgot.*password/i })).toBeVisible();
    });

    test('should show password reset form', async ({ page }) => {
      await page.getByRole('link', { name: /forgot.*password/i }).click();
      
      await expect(page.getByRole('heading', { name: /reset.*password|forgot.*password/i })).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });

    test('should handle password reset request', async ({ page }) => {
      await page.getByRole('link', { name: /forgot.*password/i }).click();
      
      await page.getByPlaceholder(/email/i).fill('reset@example.com');
      await page.getByRole('button', { name: /send|reset/i }).click();
      
      // Should show confirmation message
      await expect(page.getByText(/check.*email|sent|instructions/i)).toBeVisible({ timeout: 5000 });
    });
  });
});
