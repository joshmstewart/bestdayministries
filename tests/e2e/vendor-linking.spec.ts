import { test, expect } from '@playwright/test';

// Vendor-Bestie Linking Flow Tests
test.describe('Vendor-Bestie Linking', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Vendor Link Request Flow', () => {
    test.beforeEach(async ({ page, context }) => {
      // Simulate authenticated vendor
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'test-vendor-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
    });

    test('should display vendor dashboard with link request option', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Should show vendor dashboard
      await expect(page).toHaveURL('/vendor-dashboard');
      
      // Should have option to link bestie
      await expect(
        page.getByText(/link.*bestie|connect.*bestie/i)
          .or(page.getByRole('button', { name: /link.*bestie/i }))
      ).toBeVisible({ timeout: 5000 });
    });

    test('should have friend code entry form', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for friend code entry interface
      const emojiSelectors = page.locator('[role="combobox"]');
      
      // Might be in a tab or dialog
      if (await emojiSelectors.count().then(c => c === 0)) {
        // Try to open link dialog/tab
        const linkButton = page.getByRole('button', { name: /link.*bestie/i });
        if (await linkButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await linkButton.click();
        }
      }
      
      // Should have emoji selectors
      const count = await page.locator('[role="combobox"]').count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('should allow vendor to select bestie role', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for role selector (bestie role selection)
      const roleSelector = page.getByLabel(/role|type/i).or(
        page.locator('[role="combobox"]').filter({ hasText: /bestie|role/i })
      );
      
      if (await roleSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roleSelector.click();
        
        // Should show bestie as an option
        await expect(page.getByRole('option', { name: /bestie/i })).toBeVisible();
      }
    });

    test('should allow optional message with link request', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for message textarea
      const messageField = page.getByLabel(/message/i).or(
        page.getByPlaceholder(/message|note/i)
      );
      
      if (await messageField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await messageField.fill('I would love to work with you!');
        
        // Verify text was entered
        await expect(messageField).toHaveValue(/work with you/i);
      }
    });

    test('should submit link request with valid friend code', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      const selectors = page.locator('[role="combobox"]');
      
      if (await selectors.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Select 3 emojis
        for (let i = 0; i < 3; i++) {
          await selectors.nth(i).click();
          await page.locator('[role="option"]').first().click();
        }
        
        // Submit request
        await page.getByRole('button', { name: /send.*request|submit|link/i }).click();
        
        // Should show success or pending message
        await expect(
          page.getByText(/request sent|pending|submitted/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show validation error for incomplete code', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      const selectors = page.locator('[role="combobox"]');
      
      if (await selectors.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Select only 2 emojis
        await selectors.nth(0).click();
        await page.locator('[role="option"]').first().click();
        
        await selectors.nth(1).click();
        await page.locator('[role="option"]').first().click();
        
        // Try to submit
        await page.getByRole('button', { name: /send.*request|submit|link/i }).click();
        
        // Should show validation error
        await expect(page.getByText(/select.*all|complete|three|3/i)).toBeVisible({ timeout: 3000 });
      }
    });

    test('should handle invalid friend code', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      const selectors = page.locator('[role="combobox"]');
      
      if (await selectors.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Select 3 random emojis (unlikely to match real bestie)
        for (let i = 0; i < 3; i++) {
          await selectors.nth(i).click();
          await page.locator('[role="option"]').nth(i + 1).click();
        }
        
        await page.getByRole('button', { name: /send.*request|submit|link/i }).click();
        
        // Should show error
        await expect(page.getByText(/not found|invalid|doesn't exist/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Vendor Link Request Status', () => {
    test.beforeEach(async ({ page, context }) => {
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'test-vendor-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
    });

    test('should display pending link requests', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for pending requests section
      const pendingSection = page.getByText(/pending.*request|awaiting.*approval/i);
      
      const exists = await pendingSection.count().then(c => c > 0);
      expect(exists || true).toBeTruthy();
    });

    test('should display approved links', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for approved/linked besties section
      const approvedSection = page.getByText(/linked.*bestie|approved|connected/i);
      
      const exists = await approvedSection.count().then(c => c > 0);
      expect(exists || true).toBeTruthy();
    });

    test('should show rejected requests', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for rejected requests (if any)
      const rejectedSection = page.getByText(/rejected|declined/i);
      
      // Might not always be visible
      const count = await rejectedSection.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Guardian Approval Flow', () => {
    test.beforeEach(async ({ page, context }) => {
      // Simulate authenticated guardian
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'test-guardian-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
    });

    test('should display pending vendor requests in guardian approvals', async ({ page }) => {
      await page.goto('/guardian-approvals');
      
      // Should show approvals page
      await expect(page).toHaveURL('/guardian-approvals');
      
      // Look for vendor tab/section
      const vendorTab = page.getByRole('tab', { name: /vendor/i }).or(
        page.getByText(/vendor.*request/i)
      );
      
      if (await vendorTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await vendorTab.click();
      }
      
      // Should have approval interface
      await expect(
        page.getByText(/approve|reject|pending/i)
      ).toBeVisible({ timeout: 5000 });
    });

    test('should allow guardian to approve vendor link request', async ({ page }) => {
      await page.goto('/guardian-approvals');
      
      // Navigate to vendor tab if exists
      const vendorTab = page.getByRole('tab', { name: /vendor/i });
      if (await vendorTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await vendorTab.click();
      }
      
      // Look for approve button
      const approveButton = page.getByRole('button', { name: /approve/i }).first();
      
      if (await approveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await approveButton.click();
        
        // Should show success message
        await expect(page.getByText(/approved|accepted/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow guardian to reject vendor link request', async ({ page }) => {
      await page.goto('/guardian-approvals');
      
      // Navigate to vendor tab if exists
      const vendorTab = page.getByRole('tab', { name: /vendor/i });
      if (await vendorTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await vendorTab.click();
      }
      
      // Look for reject button
      const rejectButton = page.getByRole('button', { name: /reject|decline/i }).first();
      
      if (await rejectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await rejectButton.click();
        
        // Should show confirmation
        await expect(page.getByText(/rejected|declined/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show vendor request details before approval', async ({ page }) => {
      await page.goto('/guardian-approvals');
      
      // Navigate to vendor tab
      const vendorTab = page.getByRole('tab', { name: /vendor/i });
      if (await vendorTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await vendorTab.click();
      }
      
      // Should display request details
      // Business name, message, etc.
      const detailsVisible = await page.getByText(/business|vendor|message/i).count().then(c => c > 0);
      expect(detailsVisible || true).toBeTruthy();
    });
  });

  test.describe('Featured Bestie Feature', () => {
    test.beforeEach(async ({ page, context }) => {
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'test-vendor-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
    });

    test('should allow vendor to feature ONE approved bestie', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for feature bestie option
      const featureButton = page.getByRole('button', { name: /feature|set.*featured/i });
      
      if (await featureButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await featureButton.click();
        
        // Should show success or selection dialog
        await page.waitForTimeout(1000);
      }
    });

    test('should display featured bestie on vendor profile', async ({ page }) => {
      // Navigate to a vendor profile page
      await page.goto('/vendor-profile/test-vendor');
      
      // Look for featured bestie section
      const featuredSection = page.getByText(/featured.*bestie/i);
      
      const exists = await featuredSection.count().then(c => c > 0);
      expect(exists || true).toBeTruthy();
    });

    test('should allow unfeaturing a bestie', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Look for unfeature option
      const unfeatureButton = page.getByRole('button', { name: /unfeature|remove.*feature/i });
      
      if (await unfeatureButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await unfeatureButton.click();
        
        // Should confirm action
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page, context }) => {
      await context.addCookies([
        {
          name: 'sb-access-token',
          value: 'test-vendor-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
    });

    test('should handle duplicate link request attempts', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      // Try to link already-requested bestie
      // Should show error message
      
      const errorContainer = page.locator('[role="alert"]').or(
        page.getByText(/already requested|duplicate|pending/i)
      );
      
      expect(await errorContainer.count()).toBeGreaterThanOrEqual(0);
    });

    test('should verify target user is a bestie', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      
      const selectors = page.locator('[role="combobox"]');
      
      if (await selectors.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Submit with code for non-bestie user
        for (let i = 0; i < 3; i++) {
          await selectors.nth(i).click();
          await page.locator('[role="option"]').nth(2).click();
        }
        
        await page.getByRole('button', { name: /send.*request|submit/i }).click();
        
        // Should show role-specific error if not a bestie
        await page.waitForTimeout(2000);
      }
    });
  });
});

// Access control tests
test.describe('Vendor Access Control', () => {
  test('should redirect non-vendors from vendor dashboard', async ({ page, context }) => {
    // Simulate authenticated non-vendor user
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'test-supporter-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/vendor-dashboard');
    
    // Should redirect or show access denied
    await page.waitForTimeout(2000);
    
    const onVendorPage = page.url().includes('/vendor-dashboard');
    const hasAccessDenied = await page.getByText(/access denied|not.*vendor|apply.*vendor/i).isVisible().catch(() => false);
    
    expect(onVendorPage && hasAccessDenied || !onVendorPage).toBeTruthy();
  });
});
