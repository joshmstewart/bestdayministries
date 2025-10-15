/**
 * Mailtrap Email Testing Helper
 * 
 * Utilities for verifying emails in E2E tests using Mailtrap's API.
 * Requires MAILTRAP_API_TOKEN and MAILTRAP_INBOX_ID environment variables.
 */

interface MailtrapEmail {
  id: number;
  inbox_id: number;
  subject: string;
  sent_at: string;
  from_email: string;
  from_name: string;
  to_email: string;
  to_name: string;
  email_size: number;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  html_body: string;
  text_body: string;
  raw_body: string;
  html_path: string;
  txt_path: string;
  raw_path: string;
  html_source_path: string;
  blacklists_report_info: boolean;
  smtp_information: {
    ok: boolean;
  };
}

interface MailtrapMessage {
  id: number;
  inbox_id: number;
  subject: string;
  sent_at: string;
  from_email: string;
  from_name: string;
  to_email: string;
  to_name: string;
  html_body?: string;
  text_body?: string;
}

// Note: Mailtrap has two different API bases:
// 1. Testing/Sandbox API: https://mailtrap.io/api/accounts/{account_id}/inboxes/{inbox_id}
// 2. Email Testing API v2: https://sandbox.api.mailtrap.io/api/send/{inbox_id}
const MAILTRAP_API_BASE = 'https://mailtrap.io/api/accounts';
const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const MAILTRAP_INBOX_ID = process.env.MAILTRAP_INBOX_ID;
const MAILTRAP_ACCOUNT_ID = process.env.MAILTRAP_ACCOUNT_ID || '3242583';

if (!MAILTRAP_API_TOKEN) {
  console.warn('⚠️  MAILTRAP_API_TOKEN not set - email tests will be skipped');
}

if (!MAILTRAP_INBOX_ID) {
  console.warn('⚠️  MAILTRAP_INBOX_ID not set - email tests will be skipped');
}

/**
 * Check if Mailtrap is configured for testing
 */
export function isMailtrapConfigured(): boolean {
  return !!(MAILTRAP_API_TOKEN && MAILTRAP_INBOX_ID);
}

/**
 * Fetch all messages from the Mailtrap inbox
 */
export async function fetchAllMessages(): Promise<MailtrapMessage[]> {
  if (!isMailtrapConfigured()) {
    throw new Error('Mailtrap not configured. Set MAILTRAP_API_TOKEN and MAILTRAP_INBOX_ID.');
  }

  const url = `${MAILTRAP_API_BASE}/${MAILTRAP_ACCOUNT_ID}/inboxes/${MAILTRAP_INBOX_ID}/messages`;
  
  const response = await fetch(url, {
    headers: {
      'Api-Token': MAILTRAP_API_TOKEN!,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a specific email by ID with full body content
 */
export async function fetchEmail(emailId: number): Promise<MailtrapEmail> {
  if (!isMailtrapConfigured()) {
    throw new Error('Mailtrap not configured. Set MAILTRAP_API_TOKEN and MAILTRAP_INBOX_ID.');
  }

  const url = `${MAILTRAP_API_BASE}/${MAILTRAP_ACCOUNT_ID}/inboxes/${MAILTRAP_INBOX_ID}/messages/${emailId}`;
  
  const response = await fetch(url, {
    headers: {
      'Api-Token': MAILTRAP_API_TOKEN!,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch email: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Wait for an email matching criteria to arrive
 * 
 * @param criteria - Email matching criteria
 * @param options - Wait options
 * @returns The matching email
 */
export async function waitForEmail(
  criteria: {
    to?: string;
    subject?: string;
    from?: string;
  },
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {}
): Promise<MailtrapEmail> {
  const { timeoutMs = 30000, pollIntervalMs = 2000 } = options;
  const startTime = Date.now();
  const startTimestamp = new Date().toISOString();

  console.log(`⏳ Waiting for email matching:`, criteria, `sent after ${startTimestamp}`);

  while (Date.now() - startTime < timeoutMs) {
    const messages = await fetchAllMessages();
    
    // Find matching message sent after we started waiting
    const match = messages.find((msg) => {
      const toMatch = !criteria.to || msg.to_email.toLowerCase().includes(criteria.to.toLowerCase());
      const subjectMatch = !criteria.subject || msg.subject.toLowerCase().includes(criteria.subject.toLowerCase());
      const fromMatch = !criteria.from || msg.from_email.toLowerCase().includes(criteria.from.toLowerCase());
      const timeMatch = new Date(msg.sent_at).getTime() >= new Date(startTimestamp).getTime();
      
      return toMatch && subjectMatch && fromMatch && timeMatch;
    });

    if (match) {
      console.log(`✅ Found email: "${match.subject}" to ${match.to_email}`);
      // Fetch full email with body content
      return await fetchEmail(match.id);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timeout waiting for email matching criteria: ${JSON.stringify(criteria)}`
  );
}

/**
 * Find the latest email matching criteria
 */
export async function findLatestEmail(criteria: {
  to?: string;
  subject?: string;
  from?: string;
}): Promise<MailtrapEmail | null> {
  const messages = await fetchAllMessages();
  
  // Sort by sent_at descending (newest first)
  const sorted = messages.sort((a, b) => 
    new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );

  // Find matching message
  const match = sorted.find((msg) => {
    const toMatch = !criteria.to || msg.to_email.toLowerCase().includes(criteria.to.toLowerCase());
    const subjectMatch = !criteria.subject || msg.subject.toLowerCase().includes(criteria.subject.toLowerCase());
    const fromMatch = !criteria.from || msg.from_email.toLowerCase().includes(criteria.from.toLowerCase());
    
    return toMatch && subjectMatch && fromMatch;
  });

  if (match) {
    return await fetchEmail(match.id);
  }

  return null;
}

/**
 * Clear all emails from the inbox
 */
export async function clearInbox(): Promise<void> {
  if (!isMailtrapConfigured()) {
    throw new Error('Mailtrap not configured. Set MAILTRAP_API_TOKEN and MAILTRAP_INBOX_ID.');
  }

  // Try the updated Sandbox API endpoint structure
  // Changed from /clean to /messages with DELETE method for clearing all messages
  const url = `${MAILTRAP_API_BASE}/${MAILTRAP_ACCOUNT_ID}/inboxes/${MAILTRAP_INBOX_ID}/messages`;
  
  console.log(`🧹 Attempting to clear inbox at: ${url}`);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Api-Token': MAILTRAP_API_TOKEN!,
    },
  });

  if (!response.ok) {
    // Mailtrap Sandbox API might not support bulk delete - log warning and continue
    // Tests will still work as waitForEmail looks for new messages by timestamp
    console.warn(`⚠️  Could not clear inbox (${response.status}), continuing anyway. Old messages may be present.`);
    return;
  }

  console.log('✅ Cleared Mailtrap inbox');
}

/**
 * Verify email content matches expectations
 */
export function verifyEmailContent(
  email: MailtrapEmail,
  expectations: {
    subject?: string | RegExp;
    toEmail?: string;
    fromEmail?: string;
    htmlContains?: string[];
    textContains?: string[];
    linksContain?: string[];
  }
): void {
  if (expectations.subject) {
    const subjectMatches = 
      typeof expectations.subject === 'string'
        ? email.subject === expectations.subject
        : expectations.subject.test(email.subject);
    
    if (!subjectMatches) {
      throw new Error(
        `Email subject mismatch. Expected: ${expectations.subject}, Got: ${email.subject}`
      );
    }
  }

  if (expectations.toEmail && email.to_email !== expectations.toEmail) {
    throw new Error(
      `Email recipient mismatch. Expected: ${expectations.toEmail}, Got: ${email.to_email}`
    );
  }

  if (expectations.fromEmail && email.from_email !== expectations.fromEmail) {
    throw new Error(
      `Email sender mismatch. Expected: ${expectations.fromEmail}, Got: ${email.from_email}`
    );
  }

  if (expectations.htmlContains) {
    for (const content of expectations.htmlContains) {
      if (!email.html_body.includes(content)) {
        throw new Error(`Email HTML does not contain: "${content}"`);
      }
    }
  }

  if (expectations.textContains) {
    for (const content of expectations.textContains) {
      if (!email.text_body.includes(content)) {
        throw new Error(`Email text does not contain: "${content}"`);
      }
    }
  }

  if (expectations.linksContain) {
    for (const link of expectations.linksContain) {
      const linkRegex = new RegExp(`href=["']([^"']*${link}[^"']*)["']`, 'i');
      if (!linkRegex.test(email.html_body)) {
        throw new Error(`Email does not contain link matching: "${link}"`);
      }
    }
  }

  console.log('✅ Email content verified successfully');
}

/**
 * Extract all links from an email's HTML body
 */
export function extractLinks(email: MailtrapEmail): string[] {
  const linkRegex = /href=["']([^"']+)["']/g;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(email.html_body)) !== null) {
    links.push(match[1]);
  }

  return links;
}
