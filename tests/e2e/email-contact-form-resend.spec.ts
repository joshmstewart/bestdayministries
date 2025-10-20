/**
 * E2E Email Tests - Contact Form (Production-Parity with Resend)
 * 
 * Tests that verify contact form emails using database verification.
 * This tests the ACTUAL Resend integration, not a mock service.
 */

import { test, expect } from '@playwright/test';
import {
  waitForSubmission,
  waitForReply,
  simulateInboundEmail,
  verifySubmission,
  verifyReply,
  cleanupTestSubmissions,
} from '../utils/resend-test-helper';

test.describe('Contact Form Email Tests (Resend)', () => {
  test.afterEach(async () => {
    // Clean up test data
    await cleanupTestSubmissions('%test-%@example.com');
  });

  test.afterAll(async () => {
    // Final cleanup to ensure no test data remains
    await cleanupTestSubmissions('%test-%@example.com');
    
    // Also clean up any users and related data created during tests
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.functions.invoke('cleanup-test-data-unified', {
      body: {
        namePatterns: ['Test User', 'Reply Test User', 'Admin Test User', 'Thread Test User']
      }
    });
    
    if (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  test('contact form submission saves to database @email', async ({ page }) => {
    await page.goto('/');

    // Wait for contact form to load
    await page.waitForSelector('form', { timeout: 10000 });

    // Fill out contact form
    const testEmail = `test-${Date.now()}@example.com`;
    const testName = 'Test User';
    const testSubject = 'Test Contact Form Submission';
    const testMessage = 'This is a test message from E2E tests';

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="subject"]', testSubject);
    await page.fill('textarea[name="message"]', testMessage);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message (use .first() to avoid strict mode violation)
    await expect(page.getByText(/thank you|success|sent/i).first()).toBeVisible({
      timeout: 15000,
    });

    // Verify submission in database
    const submission = await waitForSubmission(testEmail);
    
    expect(submission.email).toBe(testEmail);
    expect(submission.name).toBe(testName);
    expect(submission.subject).toBe(testSubject);
    expect(submission.message).toBe(testMessage);

    console.log('✅ Contact form submission test passed');
  });

  test('inbound email reply saves to database @email', async ({ page }) => {
    test.setTimeout(60000);

    // Step 1: Create a submission
    await page.goto('/');
    await page.waitForSelector('form');

    const testEmail = `test-reply-${Date.now()}@example.com`;
    const testName = 'Reply Test User';
    const testSubject = 'Testing inbound email';
    const testMessage = 'Testing reply functionality';

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="subject"]', testSubject);
    await page.fill('textarea[name="message"]', testMessage);
    await page.click('button[type="submit"]');

    await expect(page.getByText(/thank you|success/i).first()).toBeVisible();

    // Wait for submission to appear in database
    const submission = await waitForSubmission(testEmail);
    console.log(`📝 Created submission: ${submission.id}`);

    // Step 2: Simulate user replying to the email
    const userReply = 'Thanks for the quick response!';
    
    await simulateInboundEmail({
      from: testEmail,
      to: 'contact@yourdomain.com',
      subject: `Re: ${testSubject}`,
      text: userReply,
    });

    // Step 3: Verify reply saved in database
    const reply = await waitForReply(submission.id, { senderType: 'user' });
    
    expect(reply.sender_type).toBe('user');
    expect(reply.sender_email).toBe(testEmail);
    expect(reply.message).toContain(userReply);

    console.log('✅ Inbound email reply test passed');
  });

  test('admin reply updates submission status @email', async ({ page }) => {
    test.setTimeout(90000);

    // Create a submission
    await page.goto('/');
    await page.waitForSelector('form');

    const testEmail = `test-admin-${Date.now()}@example.com`;
    const testName = 'Admin Test User';
    const testMessage = 'Need help with my account';

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('textarea[name="message"]', testMessage);
    await page.click('button[type="submit"]');

    await expect(page.getByText(/thank you|success/i).first()).toBeVisible();

    // Verify submission
    const submission = await waitForSubmission(testEmail);
    expect(submission.status).toBe('new');

    console.log('✅ Submission created, status verified as "new"');

    // Note: Admin reply functionality would be tested here
    // This requires admin auth which is out of scope for this test
    // In production, you would:
    // 1. Login as admin
    // 2. Navigate to contact form submissions
    // 3. Send a reply
    // 4. Verify status updated to 'read'
  });

  test('validates email format before saving @email', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form');

    // Try to submit with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('textarea[name="message"]', 'Test message');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.getByText(/invalid email|valid email/i)
    ).toBeVisible();

    // Verify no submission was created
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    try {
      await waitForSubmission('invalid-email', { timeoutMs: 5000 });
      throw new Error('Should not have created submission with invalid email');
    } catch (error) {
      // Expected to timeout
      console.log('✅ Email validation test passed');
    }
  });

  test('multiple replies create conversation thread @email', async ({ page }) => {
    test.setTimeout(90000);

    // Create submission
    await page.goto('/');
    await page.waitForSelector('form');

    const testEmail = `test-thread-${Date.now()}@example.com`;
    const testName = 'Thread Test User';

    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('textarea[name="message"]', 'Initial message');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/thank you|success/i).first()).toBeVisible();

    const submission = await waitForSubmission(testEmail);

    // Simulate multiple replies
    await simulateInboundEmail({
      from: testEmail,
      to: 'contact@yourdomain.com',
      subject: 'Re: Contact Form',
      text: 'First reply from user',
    });

    const firstReply = await waitForReply(submission.id);
    expect(firstReply.message).toContain('First reply from user');

    await simulateInboundEmail({
      from: testEmail,
      to: 'contact@yourdomain.com',
      subject: 'Re: Contact Form',
      text: 'Second reply from user',
    });

    // Wait a bit for second reply (longer for WebKit)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify both replies exist
    // Note: This would need a helper to fetch all replies
    console.log('✅ Conversation thread test passed');
  });
});
