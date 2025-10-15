/**
 * Resend Production-Parity Email Testing Helper
 * 
 * Tests email functionality using database verification instead of external email capture.
 * This ensures tests verify the ACTUAL production email infrastructure (Resend).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables for email testing');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const { timeoutMs = 30000, pollIntervalMs = 2000 } = options;
  const startTime = Date.now();
  const startTimestamp = new Date().toISOString();

  console.log(`⏳ Waiting for submission from ${email} after ${startTimestamp}`);

  while (Date.now() - startTime < timeoutMs) {
    const { data, error } = await supabase
      .from('contact_form_submissions')
      .select('*')
      .eq('email', email)
      .gte('created_at', startTimestamp)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      console.log(`✅ Found submission: ${data.id}`);
      return data as ContactFormSubmission;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timeout waiting for submission from ${email}`);
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
  const { senderType, timeoutMs = 30000, pollIntervalMs = 2000 } = options;
  const startTime = Date.now();
  const startTimestamp = new Date().toISOString();

  console.log(`⏳ Waiting for reply to submission ${submissionId} after ${startTimestamp}`);

  while (Date.now() - startTime < timeoutMs) {
    let query = supabase
      .from('contact_form_replies')
      .select('*')
      .eq('submission_id', submissionId)
      .gte('created_at', startTimestamp);

    if (senderType) {
      query = query.eq('sender_type', senderType);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      console.log(`✅ Found reply: ${data.id} (${data.sender_type})`);
      return data as ContactFormReply;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timeout waiting for reply to submission ${submissionId}`);
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
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/process-inbound-email?test=true`;
  
  console.log(`📧 Simulating inbound email from ${params.from}`);

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to simulate inbound email: ${response.status} ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Inbound email processed:`, result);
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
  const { data, error } = await supabase
    .from('contact_form_submissions')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Submission not found for email: ${email}`);
  }

  const submission = data as ContactFormSubmission;

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
  const { data, error } = await supabase
    .from('contact_form_replies')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Reply not found for submission: ${submissionId}`);
  }

  const reply = data as ContactFormReply;

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
  
  // Delete replies first (foreign key constraint)
  const { data: submissions } = await supabase
    .from('contact_form_submissions')
    .select('id')
    .ilike('email', emailPattern);

  if (submissions && submissions.length > 0) {
    const submissionIds = submissions.map((s) => s.id);
    
    await supabase
      .from('contact_form_replies')
      .delete()
      .in('submission_id', submissionIds);
    
    await supabase
      .from('contact_form_submissions')
      .delete()
      .in('id', submissionIds);
    
    console.log(`✅ Cleaned up ${submissions.length} test submissions`);
  }
}
