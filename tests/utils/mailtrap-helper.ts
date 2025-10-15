/**
 * Mailtrap Email Testing Helper
 * 
 * Utilities for verifying emails in E2E tests using Mailtrap's Sandbox API.
 * Requires MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID, and MAILTRAP_ACCOUNT_ID environment variables.
 * 
 * IMPORTANT: Uses Mailtrap Sandbox API V2 at mailtrap.io
 * - API Base: https://mailtrap.io/api/accounts/{account_id}/
 * - Authentication: Api-Token header
 * - Documentation: https://api-docs.mailtrap.io/
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

// Mailtrap Sandbox API V2 Configuration
// Using V2 API at mailtrap.io with /api/accounts/{account_id}/ path
// V2 API docs: https://api-docs.mailtrap.io/
const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const MAILTRAP_INBOX_ID = process.env.MAILTRAP_INBOX_ID;
const MAILTRAP_ACCOUNT_ID = process.env.MAILTRAP_ACCOUNT_ID;

if (!MAILTRAP_API_TOKEN) {
  console.warn('⚠️  MAILTRAP_API_TOKEN not set - email tests will be skipped');
}

if (!MAILTRAP_INBOX_ID) {
  console.warn('⚠️  MAILTRAP_INBOX_ID not set - email tests will be skipped');
}

if (!MAILTRAP_ACCOUNT_ID) {
  console.warn('⚠️  MAILTRAP_ACCOUNT_ID not set - email tests will be skipped');
}

/**
 * Debug and validate Mailtrap configuration
 */
export function debugMailtrapConfig(): void {
  console.log('\n🔍 Mailtrap Configuration Debug:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!MAILTRAP_API_TOKEN) {
    console.error('❌ MAILTRAP_API_TOKEN is not set');
  } else {
    const tokenLength = MAILTRAP_API_TOKEN.length;
    const tokenPrefix = MAILTRAP_API_TOKEN.substring(0, 4);
    const hasWhitespace = /\s/.test(MAILTRAP_API_TOKEN);
    
    console.log(`✅ Token present: ${tokenLength} characters`);
    console.log(`   First 4 chars: "${tokenPrefix}..."`);
    console.log(`   Has whitespace: ${hasWhitespace ? '❌ YES (PROBLEM!)' : '✅ No'}`);
  }
  
  if (!MAILTRAP_INBOX_ID) {
    console.error('❌ MAILTRAP_INBOX_ID is not set');
  } else {
    console.log(`✅ Inbox ID: ${MAILTRAP_INBOX_ID}`);
  }
  
  if (!MAILTRAP_ACCOUNT_ID) {
    console.error('❌ MAILTRAP_ACCOUNT_ID is not set');
  } else {
    console.log(`✅ Account ID: ${MAILTRAP_ACCOUNT_ID}`);
  }
  
  console.log('\n📍 Where to get your credentials:');
  console.log('   1. Go to https://mailtrap.io/inboxes');
  console.log('   2. Select your SANDBOX inbox (not Email Sending)');
  console.log('   3. Click the "API" tab');
  console.log('   4. Copy the "API Token" shown there');
  console.log('   5. Account ID is in the URL or API settings');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Test Mailtrap API connectivity with Api-Token header
 */
export async function testMailtrapConnectivity(): Promise<{
  success: boolean;
  method?: 'api-token';
  error?: string;
}> {
  if (!isMailtrapConfigured()) {
    return { success: false, error: 'Mailtrap not configured' };
  }

  // Test Sandbox API V2 (correct domain: mailtrap.io)
  const url = `https://mailtrap.io/api/accounts/${MAILTRAP_ACCOUNT_ID}/inboxes/${MAILTRAP_INBOX_ID}/messages`;
  
  console.log('\n🔌 Testing Mailtrap API connectivity...');
  console.log(`📍 Testing Sandbox API V2: ${url}\n`);

  // Api-Token header authentication
  try {
    console.log('Testing Api-Token header for Sandbox API V2');
    const response = await fetch(url, {
      headers: {
        'Api-Token': MAILTRAP_API_TOKEN!,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      console.log('✅ Api-Token authentication WORKS!\n');
      return { success: true, method: 'api-token' };
    } else {
      const errorText = await response.text();
      console.log(`❌ Api-Token failed: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${errorText}\n`);
      return { 
        success: false, 
        error: `Api-Token failed: ${response.status} ${response.statusText}` 
      };
    }
  } catch (error) {
    console.log(`❌ Api-Token failed with exception: ${error}\n`);
    return { 
      success: false, 
      error: `Api-Token exception: ${error}` 
    };
  }
}

/**
 * Check if Mailtrap is configured for testing
 */
export function isMailtrapConfigured(): boolean {
  return !!(MAILTRAP_API_TOKEN && MAILTRAP_INBOX_ID && MAILTRAP_ACCOUNT_ID);
}

/**
 * Validate Mailtrap configuration and test connectivity
 * Call this before running email tests
 */
export async function validateMailtrapSetup(): Promise<void> {
  debugMailtrapConfig();
  
  if (!isMailtrapConfigured()) {
    throw new Error('Mailtrap is not configured. Please set MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID, and MAILTRAP_ACCOUNT_ID environment variables.');
  }

  const connectivityTest = await testMailtrapConnectivity();
  
  if (!connectivityTest.success) {
    throw new Error(
      `Mailtrap API connectivity test failed.\n\n` +
      `${connectivityTest.error}\n\n` +
      `Common issues:\n` +
      `  1. Missing MAILTRAP_ACCOUNT_ID environment variable\n` +
      `  2. Using wrong token type (must be Email Sandbox API token, not Email Sending)\n` +
      `  3. Token doesn't have access to account ${MAILTRAP_ACCOUNT_ID} or inbox ${MAILTRAP_INBOX_ID}\n` +
      `  4. Token was copied with extra spaces/characters\n\n` +
      `Please verify your credentials at: https://mailtrap.io/inboxes/${MAILTRAP_INBOX_ID}`
    );
  }
  
  console.log(`✅ Mailtrap setup validated successfully (using ${connectivityTest.method} auth)\n`);
}

/**
 * Fetch all messages from the Mailtrap inbox
 */
export async function fetchAllMessages(): Promise<MailtrapMessage[]> {
  if (!isMailtrapConfigured()) {
    throw new Error('Mailtrap not configured. Set MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID, and MAILTRAP_ACCOUNT_ID.');
  }

  // Use Mailtrap Sandbox API V2 with account_id in path
  const url = `https://mailtrap.io/api/accounts/${MAILTRAP_ACCOUNT_ID}/inboxes/${MAILTRAP_INBOX_ID}/messages`;
  
  const response = await fetch(url, {
    headers: {
      'Api-Token': MAILTRAP_API_TOKEN!,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Failed to fetch messages from ${url}`);
    console.error(`   Status: ${response.status} ${response.statusText}`);
    console.error(`   Response: ${errorText}`);
    throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch a specific email by ID with full body content
 */
export async function fetchEmail(emailId: number): Promise<MailtrapEmail> {
  if (!isMailtrapConfigured()) {
    throw new Error('Mailtrap not configured. Set MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID, and MAILTRAP_ACCOUNT_ID.');
  }

  // Use Mailtrap Sandbox API V2 with account_id in path
  const url = `https://mailtrap.io/api/accounts/${MAILTRAP_ACCOUNT_ID}/inboxes/${MAILTRAP_INBOX_ID}/messages/${emailId}`;
  
  const response = await fetch(url, {
    headers: {
      'Api-Token': MAILTRAP_API_TOKEN!,
      'Accept': 'application/json',
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
    throw new Error('Mailtrap not configured. Set MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID, and MAILTRAP_ACCOUNT_ID.');
  }

  try {
    // Use Mailtrap Sandbox API V2 with account_id in path
    // V2 API: PATCH /api/accounts/{account_id}/inboxes/{inbox_id}/clean
    const url = `https://mailtrap.io/api/accounts/${MAILTRAP_ACCOUNT_ID}/inboxes/${MAILTRAP_INBOX_ID}/clean`;
    
    console.log(`🧹 Clearing inbox: ${MAILTRAP_INBOX_ID}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Api-Token': MAILTRAP_API_TOKEN!,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to clear inbox`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      throw new Error(`Failed to clear inbox: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Cleared Mailtrap inbox');
  } catch (error) {
    console.warn('⚠️  Failed to clear inbox:', error instanceof Error ? error.message : String(error));
    console.warn('   Tests will continue but old emails may remain in inbox');
    console.warn('   This is OK - tests filter by timestamp to avoid false positives');
  }
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
