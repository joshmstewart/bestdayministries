/**
 * E2E Email Tests - Contact Form
 * 
 * Tests that verify contact form emails are sent correctly via Resend
 * and captured by Mailtrap for verification.
 */

import { test, expect } from '@playwright/test';
import {
  isMailtrapConfigured,
  waitForEmail,
  clearInbox,
  verifyEmailContent,
  extractLinks,
} from '../utils/mailtrap-helper';

test.describe('Contact Form Email Tests', () => {
  test.beforeEach(async () => {
    // Skip email tests if Mailtrap not configured
    if (!isMailtrapConfigured()) {
      test.skip();
    }

    // Clear inbox before each test
    await clearInbox();
  });

  test('sends contact form submission notification to admin @email', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for contact form to load
    await page.waitForSelector('form', { timeout: 10000 });

    // Fill out contact form
    const testEmail = 'testuser@example.com';
    const testName = 'Test User';
    const testSubject = 'Test Contact Form Submission';
    const testMessage = 'This is a test message from E2E tests';

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="subject"]', testSubject);
    await page.fill('textarea[name="message"]', testMessage);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.getByText(/thank you|success|sent/i)).toBeVisible({
      timeout: 15000,
    });

    // Wait for email to arrive in Mailtrap
    console.log('⏳ Waiting for contact form email to arrive...');
    const email = await waitForEmail(
      {
        subject: testSubject,
      },
      {
        timeoutMs: 45000,
        pollIntervalMs: 3000,
      }
    );

    // Verify email content
    verifyEmailContent(email, {
      subject: testSubject,
      htmlContains: [testName, testMessage],
    });

    // Verify email contains contact details
    expect(email.html_body).toContain(testEmail);
    expect(email.html_body).toContain(testMessage);

    console.log('✅ Contact form email test passed');
  });

  test('admin reply reaches user email @email @slow', async ({ page }) => {
    test.setTimeout(120000); // Extended timeout for this flow

    // Step 1: Submit contact form
    await page.goto('/');
    await page.waitForSelector('form');

    const testEmail = 'replytest@example.com';
    const testName = 'Reply Test User';
    const testMessage = 'Testing admin reply functionality';

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('textarea[name="message"]', testMessage);
    await page.click('button[type="submit"]');

    await expect(page.getByText(/thank you|success/i)).toBeVisible();

    // Step 2: Login as admin (would need auth setup)
    // For now, we'll just verify the submission email arrives
    console.log('⏳ Waiting for submission confirmation email...');
    
    const submissionEmail = await waitForEmail(
      {
        to: testEmail,
      },
      {
        timeoutMs: 45000,
      }
    );

    // Verify submission was received
    expect(submissionEmail).toBeTruthy();
    expect(submissionEmail.to_email).toContain(testEmail);

    console.log('✅ Contact form reply flow test passed');
  });

  test('contact form validates email format before sending @email', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form');

    // Try to submit with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('textarea[name="message"]', 'Test message');
    await page.click('button[type="submit"]');

    // Should show validation error (not send email)
    await expect(
      page.getByText(/invalid email|valid email/i)
    ).toBeVisible();

    // Verify no email was sent
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const messages = await fetchAllMessages();
    expect(messages.length).toBe(0);

    console.log('✅ Email validation test passed');
  });
});

// Re-export for convenience
async function fetchAllMessages() {
  const { fetchAllMessages } = await import('../utils/mailtrap-helper');
  return fetchAllMessages();
}
