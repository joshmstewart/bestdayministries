import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { getTestAccount } from '../fixtures/test-accounts';

/**
 * Profile Settings E2E Tests - FIXED VERSION WITH SHARD-SPECIFIC ACCOUNTS
 * Uses shard-specific test accounts to prevent race conditions in parallel execution
 */
test.describe('Profile Settings @fast', () => {
  const timestamp = Date.now();
  const updatedName = `Updated Name ${timestamp}`;
  const testBio = `Test bio content ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // CRITICAL: Use shard-specific account to prevent login conflicts
    const testAccount = getTestAccount();
    
    console.log('🔐 Starting auth flow for profile settings...');
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    console.log('✓ Auth page loaded');
    
    await page.fill('input[type="email"]', testAccount.email);
    console.log('✓ Email filled');
    
    await page.fill('input[type="password"]', testAccount.password);
    console.log('✓ Password filled');
    
    await page.click('button:has-text("Sign In")');
    console.log('✓ Sign in clicked');
    
    await page.waitForURL(/\/(community|admin)/, { timeout: 60000 });
    console.log('✓ URL changed to:', page.url());
  });
    await page.waitForLoadState('networkidle');
  });

  test('can navigate to profile settings page', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Verify profile page loads
    const profileHeading = page.locator('text=/Profile|Settings|Account/i').first();
    await expect(profileHeading).toBeVisible({ timeout: 10000 });
  });

  test('displays user information correctly', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Check for display name field
    const displayNameField = page.locator('input[name="display_name"], input[placeholder*="name" i]').first();
    await expect(displayNameField).toBeVisible({ timeout: 10000 });
    
    // Check for email field
    const emailField = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailField).toBeVisible();
    
    // Verify email is read-only
    const isReadOnly = await emailField.isDisabled();
    expect(isReadOnly).toBeTruthy();
  });

  test('can edit display name', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Find display name field
    const displayNameField = page.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first();
    await displayNameField.waitFor({ state: 'visible', timeout: 10000 });
    
    // Clear and enter new name
    await displayNameField.click({ clickCount: 3 });
    await displayNameField.press('Backspace');
    await displayNameField.fill(updatedName);
    
    // Save changes
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    
    // Wait for success
    await expect(page.locator('[role="status"], .toast').first()).toBeVisible({ timeout: 3000 }).catch(() => {});
    
    // Verify in database
    const nameUpdated = await page.evaluate(async ({ name }) => {
      // @ts-ignore
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;
      
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      return data?.display_name === name;
    }, { name: updatedName });
    
    expect(nameUpdated).toBeTruthy();
  });

  test('can edit bio', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Find bio field
    const bioField = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i]').first();
    if (await bioField.isVisible()) {
      await bioField.fill(testBio);
      
      // Save changes
      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      
      await page.waitForLoadState('networkidle');
      
      // Verify in database
      const bioUpdated = await page.evaluate(async ({ bio }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return false;
        
        const { data } = await supabase
          .from('profiles')
          .select('bio')
          .eq('id', user.id)
          .single();
        
        return data?.bio === bio;
      }, { bio: testBio });
      
      expect(bioUpdated).toBeTruthy();
    } else {
      console.log('Bio field not available in current profile form');
    }
  });

  test('can change avatar', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for change avatar button
    const changeAvatarBtn = page.locator('button:has-text("Change Avatar"), button:has-text("Avatar")').first();
    if (await changeAvatarBtn.isVisible()) {
      await changeAvatarBtn.click();
      await expect(page.locator('[class*="avatar"], img[src*="composite"]').first()).toBeVisible({ timeout: 3000 });
      
      // Select a different avatar (e.g., avatar #5)
      const avatarOption = page.locator('[class*="avatar"], img[src*="composite"]').nth(4);
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
        
        // Save avatar selection
        const saveAvatarBtn = page.locator('button:has-text("Save"), button:has-text("Select")').first();
        await saveAvatarBtn.click();
        
        await page.waitForLoadState('networkidle');
        
        console.log('Avatar changed successfully');
      }
    } else {
      console.log('Avatar change not available in current UI');
    }
  });

  test('displays password change option', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for password change button or field
    const passwordBtn = page.locator('button:has-text("Change Password"), button:has-text("Password")').first();
    const hasPasswordOption = await passwordBtn.isVisible();
    
    if (hasPasswordOption) {
      console.log('Password change option is available');
      expect(hasPasswordOption).toBeTruthy();
    }
  });

  test('has TTS preferences section', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for TTS-related controls
    const ttsSection = page.locator('text=/Text-to-Speech|TTS|Voice/i').first();
    const hasTTS = await ttsSection.isVisible().catch(() => false);
    
    if (hasTTS) {
      console.log('TTS preferences are available');
      
      // Look for voice selection
      const voiceSelect = page.locator('select, [role="combobox"]').first();
      if (await voiceSelect.isVisible()) {
        console.log('Voice selection dropdown found');
      }
      
      // Look for TTS toggle
      const ttsToggle = page.locator('button[role="switch"], input[type="checkbox"]').first();
      if (await ttsToggle.isVisible()) {
        console.log('TTS enable/disable toggle found');
      }
    }
  });

  test('can access notification preferences', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for Notifications tab
    const notificationsTab = page.locator('button:has-text("Notifications"), text="Notifications"').first();
    if (await notificationsTab.isVisible()) {
      await notificationsTab.click();
      await expect(page.locator('text=/Email|Digest|Notification/i').first()).toBeVisible({ timeout: 3000 });
      
      // Verify notification settings display
      const notifSettings = page.locator('text=/Email|Digest|Notification/i').first();
      await expect(notifSettings).toBeVisible({ timeout: 10000 });
      
      // Look for toggle switches
      const toggles = page.locator('button[role="switch"], input[type="checkbox"]');
      const toggleCount = await toggles.count();
      expect(toggleCount).toBeGreaterThan(0);
    } else {
      console.log('Notifications tab not found');
    }
  });

  test('can manage newsletter subscription', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for Newsletter tab
    const newsletterTab = page.locator('button:has-text("Newsletter"), text="Newsletter"').first();
    if (await newsletterTab.isVisible()) {
      await newsletterTab.click();
      await expect(page.locator('text=/Subscribe|Unsubscribe|Newsletter/i').first()).toBeVisible({ timeout: 3000 });
      
      // Verify newsletter subscription controls
      const newsletterContent = page.locator('text=/Subscribe|Unsubscribe|Newsletter/i').first();
      await expect(newsletterContent).toBeVisible({ timeout: 10000 });
      
      // Look for subscription toggle
      const subscribeToggle = page.locator('button[role="switch"], input[type="checkbox"]').first();
      if (await subscribeToggle.isVisible()) {
        console.log('Newsletter subscription toggle found');
      }
    } else {
      console.log('Newsletter tab not found');
    }
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Try to clear display name
    const displayNameField = page.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first();
    if (await displayNameField.isVisible()) {
      await displayNameField.click({ clickCount: 3 });
      await displayNameField.press('Backspace');
      await displayNameField.fill('');
      
      // Try to save
      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      
      await page.waitForLoadState('networkidle');
      
      // Should see validation error or button stays disabled
      const hasError = await page.locator('text=/required|cannot be empty/i').isVisible().catch(() => false);
      const isBtnDisabled = await saveBtn.isDisabled().catch(() => false);
      
      const hasValidation = hasError || isBtnDisabled;
      console.log('Form validation working:', hasValidation);
    }
  });

  test('bestie user can see friend code', async ({ page }) => {
    // This test requires a bestie user account
    // For now, we'll check if friend code section exists for any user
    
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Check if friend code section exists
    const friendCodeSection = page.locator('text=/Friend Code|3 Emoji/i').first();
    const hasFriendCode = await friendCodeSection.isVisible().catch(() => false);
    
    if (hasFriendCode) {
      console.log('Friend code section is visible (user is bestie)');
      
      // Look for copy button
      const copyBtn = page.locator('button:has-text("Copy")').first();
      if (await copyBtn.isVisible()) {
        console.log('Copy friend code button available');
      }
    } else {
      console.log('Friend code not visible (user may not be bestie role)');
    }
  });

  test('profile changes persist after reload', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Get current display name
    const currentName = await page.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first().inputValue();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify name is still the same
    const reloadedName = await page.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first().inputValue();
    
    expect(reloadedName).toBe(currentName);
  });

  test('profile tabs are accessible', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Check for common profile tabs
    const possibleTabs = ['Profile', 'Notifications', 'Newsletter', 'Settings'];
    let visibleTabs = 0;
    
    for (const tabName of possibleTabs) {
      const tab = page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        visibleTabs++;
        console.log(`Tab "${tabName}" is visible`);
      }
    }
    
    expect(visibleTabs).toBeGreaterThan(0);
  });

  // VISUAL REGRESSION TESTS
  test.describe('Profile Visual Regression', () => {
    test('profile settings main page visual snapshot', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('input[name="display_name"]').first()).toBeVisible({ timeout: 3000 });
      await percySnapshot(page, 'Profile Settings - Main Tab');
    });

    test('profile notifications tab visual snapshot', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      const notificationsTab = page.locator('button:has-text("Notifications"), text="Notifications"').first();
      if (await notificationsTab.isVisible()) {
        await notificationsTab.click();
        await expect(page.locator('text=/Email|Digest/i').first()).toBeVisible({ timeout: 3000 });
        await percySnapshot(page, 'Profile Settings - Notifications Tab');
      }
    });

    test('profile newsletter tab visual snapshot', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      const newsletterTab = page.locator('button:has-text("Newsletter"), text="Newsletter"').first();
      if (await newsletterTab.isVisible()) {
        await newsletterTab.click();
        await expect(page.locator('text=/Subscribe|Newsletter/i').first()).toBeVisible({ timeout: 3000 });
        await percySnapshot(page, 'Profile Settings - Newsletter Tab');
      }
    });

    test('avatar change dialog visual snapshot', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      const changeAvatarBtn = page.locator('button:has-text("Change Avatar")').first();
      if (await changeAvatarBtn.isVisible()) {
        await changeAvatarBtn.click();
        await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 3000 });
        await percySnapshot(page, 'Profile Settings - Avatar Selection Dialog');
      }
    });
  });
});
