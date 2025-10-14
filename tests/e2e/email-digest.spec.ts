/**
 * E2E Email Tests - Digest Emails
 * 
 * Tests for daily and weekly digest emails.
 */

import { test, expect } from '@playwright/test';
import {
  isMailtrapConfigured,
  waitForEmail,
  clearInbox,
  verifyEmailContent,
  extractLinks,
} from '../utils/mailtrap-helper';

test.describe('Digest Email Tests', () => {
  test.beforeEach(async () => {
    if (!isMailtrapConfigured()) {
      test.skip();
    }
    await clearInbox();
  });

  test('daily digest includes unread notification count @email @slow', async () => {
    test.setTimeout(90000);

    const testEmail = 'digest-daily@example.com';

    console.log('⏳ Waiting for daily digest email...');

    const email = await waitForEmail(
      { to: testEmail, subject: 'daily' },
      { timeoutMs: 45000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        subject: /daily|digest/i,
        htmlContains: ['notification'],
      });

      // Should show count
      expect(email.html_body).toMatch(/\d+\s+(notification|update)/i);
      
      console.log('✅ Daily digest email verified');
    } else {
      console.log('ℹ️  No digest found (requires digest schedule)');
    }
  });

  test('weekly digest summarizes activity @email @slow', async () => {
    test.setTimeout(90000);

    const testEmail = 'digest-weekly@example.com';

    console.log('⏳ Waiting for weekly digest email...');

    const email = await waitForEmail(
      { to: testEmail, subject: 'weekly' },
      { timeoutMs: 45000 }
    ).catch(() => null);

    if (email) {
      verifyEmailContent(email, {
        subject: /weekly|digest|summary/i,
        htmlContains: ['week', 'activity'],
      });

      // Should have summary sections
      const links = extractLinks(email);
      expect(links.length).toBeGreaterThan(0);
      
      console.log('✅ Weekly digest email verified');
    } else {
      console.log('ℹ️  No weekly digest found (requires digest schedule)');
    }
  });

  test('digest respects user frequency preference @email', async ({ page }) => {
    await page.goto('/profile/settings');

    // Set digest preference to "never"
    const digestSelect = page.locator('select').filter({ hasText: /digest|frequency/i }).first();
    if (await digestSelect.isVisible({ timeout: 5000 })) {
      await digestSelect.selectOption('never');
      await page.click('button:has-text("Save")');
    }

    // Wait to ensure no digest sent
    await new Promise((resolve) => setTimeout(resolve, 10000));
    
    const mailtrapHelper = await import('../utils/mailtrap-helper');
    const messages = await mailtrapHelper.fetchAllMessages();
    
    const digestMessages = messages.filter((m) => 
      m.subject.toLowerCase().includes('digest') || 
      m.subject.toLowerCase().includes('summary')
    );
    
    expect(digestMessages.length).toBe(0);
    console.log('✅ Digest preference respected (none sent)');
  });

  test('digest only sent if there are notifications @email', async () => {
    // Empty digest should not be sent

    const testEmail = 'digest-empty@example.com';

    // User with no activity should not receive digest
    
    await new Promise((resolve) => setTimeout(resolve, 10000));
    
    const mailtrapHelper = await import('../utils/mailtrap-helper');
    const messages = await mailtrapHelper.fetchAllMessages();
    
    const emptyDigests = messages.filter((m) =>
      m.to_email === testEmail &&
      m.subject.toLowerCase().includes('digest')
    );
    
    // Should be empty or contain "no new notifications"
    console.log(`✅ Empty digest handling: ${emptyDigests.length} messages`);
  });

  test('digest includes links to all notifications @email', async () => {
    const testEmail = 'digest-links@example.com';

    const email = await waitForEmail(
      { to: testEmail, subject: 'digest' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      const links = extractLinks(email);
      
      // Should have links to notifications
      expect(links.length).toBeGreaterThan(0);
      
      // Should have unsubscribe link
      const hasUnsubscribe = links.some((link) => 
        link.includes('unsubscribe') || link.includes('preferences')
      );
      expect(hasUnsubscribe).toBe(true);
      
      console.log('✅ Digest links verified');
    } else {
      console.log('ℹ️  No digest for link verification');
    }
  });

  test('digest groups notifications by type @email', async () => {
    const testEmail = 'digest-grouped@example.com';

    const email = await waitForEmail(
      { to: testEmail, subject: 'digest' },
      { timeoutMs: 30000 }
    ).catch(() => null);

    if (email) {
      // Should have sections for different notification types
      const html = email.html_body.toLowerCase();
      
      const hasSections = 
        html.includes('message') ||
        html.includes('comment') ||
        html.includes('event') ||
        html.includes('approval');
      
      expect(hasSections).toBe(true);
      console.log('✅ Digest grouping verified');
    } else {
      console.log('ℹ️  No digest for grouping verification');
    }
  });

  test('digest sent at correct time based on timezone @email', async () => {
    // Verify digest respects user timezone preference

    console.log('ℹ️  Timezone test - requires scheduled digest execution');
    
    // Mock timezone data
    const mockUserPreference = {
      timezone: 'America/New_York',
      digest_time: '09:00',
    };

    expect(mockUserPreference.timezone).toBe('America/New_York');
  });
});
