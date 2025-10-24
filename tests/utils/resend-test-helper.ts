/**
 * Resend Production-Parity Email Testing Helper
 * 
 * Tests email functionality using database verification via edge function.
 * This ensures tests verify the ACTUAL production email infrastructure (Resend)
 * without exposing the service role key to GitHub Actions.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables for email testing');
}

// Export Supabase client for direct database queries in tests
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to call the test edge function
async function callTestHelper(action: string, params: Record<string, any>) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/test-contact-form-helper`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Test helper failed: ${response.status} ${error}`);
  }

  return response.json();
}

interface ContactFormSubmission {
  id: string;
  email: string;
  name: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  replied_at: string | null;
  replied_by: string | null;
  reply_message: string | null;
}

interface ContactFormReply {
  id: string;
  submission_id: string;
  sender_type: string;
  sender_email: string;
  sender_name: string;
  message: string;
  created_at: string;
}

/**
 * Wait for a contact form submission to appear in database
 */
export async function waitForSubmission(
  email: string,
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {}
): Promise<ContactFormSubmission> {
  const timeoutMs = options.timeoutMs || 30000; // Increased to 30s
  console.log(`⏳ Waiting for submission from ${email} (timeout: ${timeoutMs}ms)`);

  const result = await callTestHelper('waitForSubmission', { 
    email, 
    timeoutMs,
    pollIntervalMs: options.pollIntervalMs 
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to find submission');
  }

  console.log(`✅ Found submission: ${result.submission.id}`);
  return result.submission as ContactFormSubmission;
}

/**
 * Wait for a reply to appear in database
 */
export async function waitForReply(
  submissionId: string,
  options: {
    senderType?: 'admin' | 'user';
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {}
): Promise<ContactFormReply> {
  const timeoutMs = options.timeoutMs || 30000; // Increased to 30s
  console.log(`⏳ Waiting for reply to submission ${submissionId} (timeout: ${timeoutMs}ms)`);

  const result = await callTestHelper('waitForReply', { 
    submissionId,
    timeoutMs,
    pollIntervalMs: options.pollIntervalMs
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to find reply');
  }

  console.log(`✅ Found reply: ${result.reply.id}`);
  return result.reply as ContactFormReply;
}

/**
 * Simulate inbound email by calling edge function directly
 */
export async function simulateInboundEmail(params: {
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  console.log(`📧 Simulating inbound email from ${params.from}`);

  // Call through the test helper edge function which has the webhook secret
  const result = await callTestHelper('simulateInboundEmail', params);
  
  if (!result.success) {
    throw new Error(`Failed to simulate inbound email: ${JSON.stringify(result.error)}`);
  }

  console.log(`✅ Inbound email processed:`, result.result);
}

/**
 * Verify submission exists in database
 */
export async function verifySubmission(
  email: string,
  expectations: {
    name?: string;
    subject?: string;
    message?: string;
    status?: string;
  }
): Promise<ContactFormSubmission> {
  const result = await callTestHelper('getSubmission', { email });
  
  if (!result.success) {
    throw new Error(`Submission not found for email: ${email}`);
  }

  const submission = result.submission as ContactFormSubmission;

  if (expectations.name && submission.name !== expectations.name) {
    throw new Error(`Name mismatch: expected "${expectations.name}", got "${submission.name}"`);
  }

  if (expectations.subject && submission.subject !== expectations.subject) {
    throw new Error(`Subject mismatch: expected "${expectations.subject}", got "${submission.subject}"`);
  }

  if (expectations.message && !submission.message.includes(expectations.message)) {
    throw new Error(`Message does not contain: "${expectations.message}"`);
  }

  if (expectations.status && submission.status !== expectations.status) {
    throw new Error(`Status mismatch: expected "${expectations.status}", got "${submission.status}"`);
  }

  console.log('✅ Submission verified');
  return submission;
}

/**
 * Verify reply exists in database
 */
export async function verifyReply(
  submissionId: string,
  expectations: {
    senderType?: 'admin' | 'user';
    messageContains?: string;
    senderEmail?: string;
  }
): Promise<ContactFormReply> {
  const result = await callTestHelper('waitForReply', { submissionId });
  
  if (!result.success) {
    throw new Error(`Reply not found for submission: ${submissionId}`);
  }

  const reply = result.reply as ContactFormReply;

  if (expectations.senderType && reply.sender_type !== expectations.senderType) {
    throw new Error(`Sender type mismatch: expected "${expectations.senderType}", got "${reply.sender_type}"`);
  }

  if (expectations.messageContains && !reply.message.includes(expectations.messageContains)) {
    throw new Error(`Reply does not contain: "${expectations.messageContains}"`);
  }

  if (expectations.senderEmail && reply.sender_email !== expectations.senderEmail) {
    throw new Error(`Sender email mismatch: expected "${expectations.senderEmail}", got "${reply.sender_email}"`);
  }

  console.log('✅ Reply verified');
  return reply;
}

/**
 * Clean up test data
 */
export async function cleanupTestSubmissions(emailPattern: string): Promise<void> {
  console.log(`🧹 Cleaning up test submissions matching: ${emailPattern}`);
  
  await callTestHelper('cleanup', { email: emailPattern });
  
  console.log(`✅ Cleaned up test submissions`);
}
