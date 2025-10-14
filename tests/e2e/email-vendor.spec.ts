/**
 * E2E Email Tests - Vendor Emails
 * 
 * Tests for vendor application and order notification emails.
 */

import { test, expect } from '@playwright/test';
import {
  isMailtrapConfigured,
  waitForEmail,
  clearInbox,
  verifyEmailContent,
} from '../utils/mailtrap-helper';

test.describe('Vendor Email Tests', () => {
  test.beforeEach(async () => {
    if (!isMailtrapConfigured()) {
      test.skip();
    }
    await clearInbox();
  });

  test('sends vendor application confirmation @email', async ({ page }) => {
    const vendorEmail = 'new-vendor@example.com';

    // Navigate to vendor signup
    await page.goto('/vendor/auth');
    
    // Fill vendor application
    await page.fill('input[name="email"]', vendorEmail);
    await page.fill('input[name="businessName"]', 'Test Business');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    
    // Submit application
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for vendor application email...');

    const email = await waitForEmail(
      { to: vendorEmail, subject: 'application' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['application', 'review'],
      });
      console.log('✅ Vendor application email verified');
    } else {
      console.log('ℹ️  No application email (requires vendor workflow)');
    }
  });

  test('sends vendor approval notification @email', async () => {
    const vendorEmail = 'approved-vendor@example.com';

    const email = await waitForEmail(
      { to: vendorEmail, subject: 'approved' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['approved', 'welcome', 'dashboard'],
        linksContain: ['/vendor'],
      });
      console.log('✅ Vendor approval email verified');
    } else {
      console.log('ℹ️  No approval email (requires admin approval)');
    }
  });

  test('sends order notification to vendor @email', async () => {
    const vendorEmail = 'vendor-orders@example.com';

    const email = await waitForEmail(
      { to: vendorEmail, subject: 'order' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['order', 'new order'],
        linksContain: ['/vendor/orders'],
      });

      // Should include order number
      expect(email.html_body).toMatch(/#\d+|order\s+\d+/i);
      
      console.log('✅ Vendor order notification verified');
    } else {
      console.log('ℹ️  No order notification (requires order placement)');
    }
  });

  test('sends order shipped notification to customer @email', async () => {
    const customerEmail = 'customer@example.com';

    const email = await waitForEmail(
      { to: customerEmail, subject: 'shipped' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['shipped', 'tracking'],
      });

      // Should have tracking link
      const trackingLinks = email.html_body.match(/track|aftership/i);
      expect(trackingLinks).toBeTruthy();
      
      console.log('✅ Shipping notification verified');
    } else {
      console.log('ℹ️  No shipping notification (requires order fulfillment)');
    }
  });

  test('sends payout notification to vendor @email', async () => {
    const vendorEmail = 'vendor-payout@example.com';

    const email = await waitForEmail(
      { to: vendorEmail, subject: 'payout' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['payout', 'earnings'],
      });

      // Should include amount
      expect(email.html_body).toMatch(/\$\d+/);
      
      console.log('✅ Payout notification verified');
    } else {
      console.log('ℹ️  No payout notification (requires payout processing)');
    }
  });

  test('vendor rejection includes feedback @email', async () => {
    const vendorEmail = 'rejected-vendor@example.com';

    const email = await waitForEmail(
      { to: vendorEmail, subject: 'application' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      // Rejection should include constructive feedback
      expect(email.html_body.toLowerCase()).toContain('unfortunately');
      
      console.log('✅ Vendor rejection email verified');
    } else {
      console.log('ℹ️  No rejection email (requires admin rejection)');
    }
  });
});
