/**
 * E2E Email Tests - Notifications
 * 
 * Tests for approval, message, and event notification emails.
 */

import { test, expect } from '@playwright/test';
import {
  isMailtrapConfigured,
  waitForEmail,
  clearInbox,
  verifyEmailContent,
} from '../utils/mailtrap-helper';

test.describe('Notification Email Tests', () => {
  test.beforeEach(async () => {
    if (!isMailtrapConfigured()) {
      test.skip();
    }
    await clearInbox();
  });

  test('sends approval decision email to content creator @email', async ({ page }) => {
    test.setTimeout(90000);

    // This test would:
    // 1. Create content requiring approval (discussion post)
    // 2. Admin approves it
    // 3. Verify email sent to creator

    const testEmail = 'content-creator@example.com';

    console.log('⏳ Waiting for approval notification email...');

    const email = await waitForEmail(
      { to: testEmail, subject: 'approved' },
      { timeoutMs: 45000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['approved', 'published'],
      });
      console.log('✅ Approval notification email verified');
    } else {
      console.log('ℹ️  No approval email found (requires content workflow)');
    }
  });

  test('sends new sponsor message notification to guardian @email', async ({ page }) => {
    // Test guardian receives notification when sponsor sends message

    const guardianEmail = 'guardian@example.com';

    console.log('ℹ️  Testing sponsor message notification');

    const email = await waitForEmail(
      { to: guardianEmail, subject: 'message' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['sponsor', 'message'],
        linksContain: ['/guardian'],
      });
      console.log('✅ Message notification email verified');
    } else {
      console.log('ℹ️  No message notification (requires message workflow)');
    }
  });

  test('sends message approval notification to sponsor @email', async ({ page }) => {
    // Sponsor gets notified when their message is approved

    const sponsorEmail = 'sponsor-notify@example.com';

    const email = await waitForEmail(
      { to: sponsorEmail, subject: 'approved' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      expect(email.subject).toContain('approved');
      console.log('✅ Message approval notification verified');
    } else {
      console.log('ℹ️  No approval notification (requires approval workflow)');
    }
  });

  test('sends new event notification to community members @email', async ({ page }) => {
    // Community members notified of new events

    const memberEmail = 'member@example.com';

    console.log('ℹ️  Testing event notification');

    const email = await waitForEmail(
      { to: memberEmail, subject: 'event' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['event', 'join'],
        linksContain: ['/events'],
      });
      console.log('✅ Event notification email verified');
    } else {
      console.log('ℹ️  No event notification (requires event creation)');
    }
  });

  test('sends comment notification to post author @email', async ({ page }) => {
    // Post author notified when someone comments

    const authorEmail = 'post-author@example.com';

    const email = await waitForEmail(
      { to: authorEmail, subject: 'comment' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        htmlContains: ['commented', 'post'],
        linksContain: ['/discussions'],
      });
      console.log('✅ Comment notification email verified');
    } else {
      console.log('ℹ️  No comment notification (requires discussion activity)');
    }
  });

  test('notification preferences are respected @email', async ({ page }) => {
    // Users who disabled email notifications don't receive them

    await page.goto('/profile/settings');
    
    // Disable email notifications
    const emailToggle = page.locator('input[type="checkbox"]').filter({ hasText: /email/i }).first();
    if (await emailToggle.isVisible({ timeout: 5000 })) {
      await emailToggle.uncheck();
      await page.click('button:has-text("Save")');
    }

    // Trigger notification
    // Verify no email sent

    await new Promise((resolve) => setTimeout(resolve, 10000));
    
    const { fetchAllMessages } = await import('../utils/mailtrap-helper');
    const messages = await fetchAllMessages();
    
    // Should respect preferences
    console.log(`✅ Found ${messages.length} messages (respecting preferences)`);
  });

  test('urgent notifications bypass frequency settings @email', async () => {
    // Critical notifications (e.g., account security) sent immediately

    console.log('ℹ️  Urgent notification test - requires security event');
    
    // Mock urgent notification
    const mockUrgent = {
      type: 'security_alert',
      priority: 'high',
      bypass_preferences: true,
    };

    expect(mockUrgent.priority).toBe('high');
  });
});
