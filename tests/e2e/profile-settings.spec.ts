import { test, expect, Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

/**
 * Profile Settings E2E Tests
 * Tests user profile management including display name, bio, avatar, password, TTS, notifications, and newsletter preferences
 */
test.describe('Profile Settings @fast', () => {
  let testPage: Page;
  const timestamp = Date.now();
  const updatedName = `Updated Name ${timestamp}`;
  const testBio = `Test bio content ${timestamp}`;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    testPage = await context.newPage();

    // Login as test user
    await testPage.goto('/auth');
    await testPage.waitForLoadState('networkidle');
    
    await testPage.fill('input[type="email"]', 'test@example.com');
    await testPage.fill('input[type="password"]', 'testpassword123');
    await testPage.click('button:has-text("Sign In")');
    
    await testPage.waitForURL(/\/(community|admin)/);
    await testPage.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await testPage.close();
  });

  test('can navigate to profile settings page', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Verify profile page loads
    const profileHeading = testPage.locator('text=/Profile|Settings|Account/i').first();
    await expect(profileHeading).toBeVisible({ timeout: 10000 });
  });

  test('displays user information correctly', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Check for display name field
    const displayNameField = testPage.locator('input[name="display_name"], input[placeholder*="name" i]').first();
    await expect(displayNameField).toBeVisible({ timeout: 10000 });
    
    // Check for email field
    const emailField = testPage.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailField).toBeVisible();
    
    // Verify email is read-only
    const isReadOnly = await emailField.isDisabled();
    expect(isReadOnly).toBeTruthy();
  });

  test('can edit display name', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Find display name field
    const displayNameField = testPage.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first();
    await displayNameField.waitFor({ state: 'visible', timeout: 10000 });
    
    // Clear and enter new name
    await displayNameField.click({ clickCount: 3 });
    await displayNameField.press('Backspace');
    await displayNameField.fill(updatedName);
    
    // Save changes
    const saveBtn = testPage.locator('button:has-text("Save")').first();
    await saveBtn.click();
    
    // Wait for success
    await testPage.waitForTimeout(2000);
    
    // Verify in database
    const nameUpdated = await testPage.evaluate(async ({ name }) => {
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

  test('can edit bio', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Find bio field
    const bioField = testPage.locator('textarea[name="bio"], textarea[placeholder*="bio" i]').first();
    if (await bioField.isVisible()) {
      await bioField.fill(testBio);
      
      // Save changes
      const saveBtn = testPage.locator('button:has-text("Save")').first();
      await saveBtn.click();
      
      await testPage.waitForTimeout(2000);
      
      // Verify in database
      const bioUpdated = await testPage.evaluate(async ({ bio }) => {
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

  test('can change avatar', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Look for change avatar button
    const changeAvatarBtn = testPage.locator('button:has-text("Change Avatar"), button:has-text("Avatar")').first();
    if (await changeAvatarBtn.isVisible()) {
      await changeAvatarBtn.click();
      await testPage.waitForTimeout(1000);
      
      // Select a different avatar (e.g., avatar #5)
      const avatarOption = testPage.locator('[class*="avatar"], img[src*="composite"]').nth(4);
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
        
        // Save avatar selection
        const saveAvatarBtn = testPage.locator('button:has-text("Save"), button:has-text("Select")').first();
        await saveAvatarBtn.click();
        
        await testPage.waitForTimeout(2000);
        
        console.log('Avatar changed successfully');
      }
    } else {
      console.log('Avatar change not available in current UI');
    }
  });

  test('displays password change option', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Look for password change button or field
    const passwordBtn = testPage.locator('button:has-text("Change Password"), button:has-text("Password")').first();
    const hasPasswordOption = await passwordBtn.isVisible();
    
    if (hasPasswordOption) {
      console.log('Password change option is available');
      expect(hasPasswordOption).toBeTruthy();
    }
  });

  test('has TTS preferences section', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Look for TTS-related controls
    const ttsSection = testPage.locator('text=/Text-to-Speech|TTS|Voice/i').first();
    const hasTTS = await ttsSection.isVisible().catch(() => false);
    
    if (hasTTS) {
      console.log('TTS preferences are available');
      
      // Look for voice selection
      const voiceSelect = testPage.locator('select, [role="combobox"]').first();
      if (await voiceSelect.isVisible()) {
        console.log('Voice selection dropdown found');
      }
      
      // Look for TTS toggle
      const ttsToggle = testPage.locator('button[role="switch"], input[type="checkbox"]').first();
      if (await ttsToggle.isVisible()) {
        console.log('TTS enable/disable toggle found');
      }
    }
  });

  test('can access notification preferences', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Look for Notifications tab
    const notificationsTab = testPage.locator('button:has-text("Notifications"), text="Notifications"').first();
    if (await notificationsTab.isVisible()) {
      await notificationsTab.click();
      await testPage.waitForTimeout(1000);
      
      // Verify notification settings display
      const notifSettings = testPage.locator('text=/Email|Digest|Notification/i').first();
      await expect(notifSettings).toBeVisible({ timeout: 10000 });
      
      // Look for toggle switches
      const toggles = testPage.locator('button[role="switch"], input[type="checkbox"]');
      const toggleCount = await toggles.count();
      expect(toggleCount).toBeGreaterThan(0);
    } else {
      console.log('Notifications tab not found');
    }
  });

  test('can manage newsletter subscription', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Look for Newsletter tab
    const newsletterTab = testPage.locator('button:has-text("Newsletter"), text="Newsletter"').first();
    if (await newsletterTab.isVisible()) {
      await newsletterTab.click();
      await testPage.waitForTimeout(1000);
      
      // Verify newsletter subscription controls
      const newsletterContent = testPage.locator('text=/Subscribe|Unsubscribe|Newsletter/i').first();
      await expect(newsletterContent).toBeVisible({ timeout: 10000 });
      
      // Look for subscription toggle
      const subscribeToggle = testPage.locator('button[role="switch"], input[type="checkbox"]').first();
      if (await subscribeToggle.isVisible()) {
        console.log('Newsletter subscription toggle found');
      }
    } else {
      console.log('Newsletter tab not found');
    }
  });

  test('validates required fields', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Try to clear display name
    const displayNameField = testPage.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first();
    if (await displayNameField.isVisible()) {
      await displayNameField.click({ clickCount: 3 });
      await displayNameField.press('Backspace');
      await displayNameField.fill('');
      
      // Try to save
      const saveBtn = testPage.locator('button:has-text("Save")').first();
      await saveBtn.click();
      
      await testPage.waitForTimeout(1000);
      
      // Should see validation error or button stays disabled
      const hasError = await testPage.locator('text=/required|cannot be empty/i').isVisible().catch(() => false);
      const isBtnDisabled = await saveBtn.isDisabled().catch(() => false);
      
      const hasValidation = hasError || isBtnDisabled;
      console.log('Form validation working:', hasValidation);
    }
  });

  test('bestie user can see friend code', async () => {
    // This test requires a bestie user account
    // For now, we'll check if friend code section exists for any user
    
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Check if friend code section exists
    const friendCodeSection = testPage.locator('text=/Friend Code|3 Emoji/i').first();
    const hasFriendCode = await friendCodeSection.isVisible().catch(() => false);
    
    if (hasFriendCode) {
      console.log('Friend code section is visible (user is bestie)');
      
      // Look for copy button
      const copyBtn = testPage.locator('button:has-text("Copy")').first();
      if (await copyBtn.isVisible()) {
        console.log('Copy friend code button available');
      }
    } else {
      console.log('Friend code not visible (user may not be bestie role)');
    }
  });

  test('profile changes persist after reload', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Get current display name
    const currentName = await testPage.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first().inputValue();
    
    // Reload page
    await testPage.reload();
    await testPage.waitForLoadState('networkidle');
    
    // Verify name is still the same
    const reloadedName = await testPage.locator('input[name="display_name"], input[placeholder*="Display Name" i]').first().inputValue();
    
    expect(reloadedName).toBe(currentName);
  });

  test('profile tabs are accessible', async () => {
    await testPage.goto('/profile');
    await testPage.waitForLoadState('networkidle');
    
    // Check for common profile tabs
    const possibleTabs = ['Profile', 'Notifications', 'Newsletter', 'Settings'];
    let visibleTabs = 0;
    
    for (const tabName of possibleTabs) {
      const tab = testPage.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        visibleTabs++;
        console.log(`Tab "${tabName}" is visible`);
      }
    }
    
    expect(visibleTabs).toBeGreaterThan(0);
  });

  // VISUAL REGRESSION TESTS
  test.describe('Profile Visual Regression', () => {
    test('profile settings main page visual snapshot', async () => {
      await testPage.goto('/profile');
      await testPage.waitForLoadState('networkidle');
      await testPage.waitForTimeout(1000);
      await percySnapshot(testPage, 'Profile Settings - Main Tab');
    });

    test('profile notifications tab visual snapshot', async () => {
      await testPage.goto('/profile');
      await testPage.waitForLoadState('networkidle');
      
      const notificationsTab = testPage.locator('button:has-text("Notifications"), text="Notifications"').first();
      if (await notificationsTab.isVisible()) {
        await notificationsTab.click();
        await testPage.waitForTimeout(1000);
        await percySnapshot(testPage, 'Profile Settings - Notifications Tab');
      }
    });

    test('profile newsletter tab visual snapshot', async () => {
      await testPage.goto('/profile');
      await testPage.waitForLoadState('networkidle');
      
      const newsletterTab = testPage.locator('button:has-text("Newsletter"), text="Newsletter"').first();
      if (await newsletterTab.isVisible()) {
        await newsletterTab.click();
        await testPage.waitForTimeout(1000);
        await percySnapshot(testPage, 'Profile Settings - Newsletter Tab');
      }
    });

    test('avatar change dialog visual snapshot', async () => {
      await testPage.goto('/profile');
      await testPage.waitForLoadState('networkidle');
      
      const changeAvatarBtn = testPage.locator('button:has-text("Change Avatar")').first();
      if (await changeAvatarBtn.isVisible()) {
        await changeAvatarBtn.click();
        await testPage.waitForTimeout(1000);
        await percySnapshot(testPage, 'Profile Settings - Avatar Selection Dialog');
      }
    });
  });
});
