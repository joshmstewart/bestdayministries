import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InboundEmailPayload {
  from: string;
  to: string;
  cc?: string; // CC recipients
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  in_reply_to?: string;
  references?: string;
  raw?: string; // Cloudflare Email Worker sends raw email
  // Cloudflare format
  headers?: Record<string, string>;
  rawSize?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify webhook secret
  const webhookSecret = Deno.env.get('CLOUDFLARE_EMAIL_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-webhook-secret');
  
  console.log('[process-inbound-email] Secret check:', {
    hasEnvSecret: !!webhookSecret,
    hasProvidedSecret: !!providedSecret,
    secretsMatch: webhookSecret === providedSecret,
    providedSecretPreview: providedSecret ? providedSecret.substring(0, 10) + '...' : 'none'
  });
  
  if (!webhookSecret || providedSecret !== webhookSecret) {
    console.error('[process-inbound-email] Webhook secret verification failed');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  console.log('[process-inbound-email] Webhook secret verified');

  try {
    // Detect test mode from query param
    const url = new URL(req.url);
    const isTestMode = url.searchParams.get('test') === 'true';
    
    if (isTestMode) {
      console.log('[TEST MODE] Processing test email');
    }

    console.log('[process-inbound-email] Received webhook');

    const payload: InboundEmailPayload = await req.json();
    
    // Handle Cloudflare Email Worker format
    let subject = payload.subject;
    if (!subject && payload.headers?.subject) {
      subject = payload.headers.subject;
    }
    
    console.log('[process-inbound-email] Payload:', {
      from: payload.from,
      to: payload.to,
      subject: subject,
      has_html: !!payload.html,
      has_text: !!payload.text,
      has_raw: !!payload.raw,
      source: payload.headers ? 'cloudflare' : 'resend'
    });

    // Parse raw email if provided (Cloudflare format)
    let emailText = payload.text || payload.html || '';
    if (payload.raw && !emailText) {
      emailText = parseRawEmail(payload.raw);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract sender email - try to get original sender from raw headers first
    let senderEmail: string | null = null;
    let senderNameFromHeaders = '';
    
    if (payload.raw) {
      const originalSender = extractOriginalSender(payload.raw);
      if (originalSender) {
        senderEmail = originalSender.email;
        senderNameFromHeaders = originalSender.name;
        console.log('[process-inbound-email] Original sender from raw headers:', { senderEmail, senderNameFromHeaders });
      }
    }
    
    // Fallback to payload.from if no original sender found
    if (!senderEmail) {
      senderEmail = extractEmail(payload.from);
    }
    
    if (!senderEmail) {
      throw new Error('Could not extract sender email');
    }

    console.log('[process-inbound-email] Sender email:', senderEmail);
    
    // ========== FILTER OUT SYSTEM EMAILS ==========
    // Ignore emails from our own system to prevent duplicate submissions
    const systemEmailPatterns = [
      'noreply@bestdayministries.org',
      'noreply@bestdayministries.com',
      '@send.bestdayministries.org', // Cloudflare bounce addresses
      'notifications@bestdayministries',
    ];
    
    const isSystemEmail = systemEmailPatterns.some(pattern => 
      senderEmail.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // Also check if it's a Cloudflare forwarding address (long hex ID)
    const isCloudflareForward = /^[0-9a-f-]{30,}@send\.bestdayministries\.org$/i.test(senderEmail);
    
    // Also check if subject indicates it's a system notification
    const emailSubject = payload.subject || payload.headers?.subject || '';
    const isSystemNotification = emailSubject.includes('[Action Required]') && 
      (emailSubject.includes('New general submission') || 
       emailSubject.includes('New Inbound Email') ||
       emailSubject.includes('Contact Form Submission'));
    
    if (isSystemEmail || isCloudflareForward || isSystemNotification) {
      console.log('[process-inbound-email] Ignoring system email:', { 
        senderEmail, 
        isSystemEmail, 
        isCloudflareForward, 
        isSystemNotification,
        subject: emailSubject 
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'System email ignored',
          ignored: true 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========== AMBASSADOR EMAIL THREAD HANDLING ==========
    // Check if email is sent to reply-{threadKey}@bestdayministries.org
    const toAddress = payload.to.toLowerCase();
    const ambassadorThreadMatch = toAddress.match(/reply-([a-f0-9]+)@bestdayministries\.org/);
    
    if (ambassadorThreadMatch) {
      const threadKey = ambassadorThreadMatch[1];
      console.log('[Ambassador Thread] Matched thread key:', threadKey);
      
      // Look up the thread
      const { data: thread, error: threadError } = await supabase
        .from('ambassador_email_threads')
        .select(`
          id,
          recipient_email,
          subject,
          ambassador_profiles!inner (
            ambassador_email,
            personal_email
          )
        `)
        .eq('thread_key', threadKey)
        .single();
      
      if (threadError || !thread) {
        console.error('[Ambassador Thread] Thread not found:', threadError);
        // Return 200 to prevent retries - invalid thread
        return new Response(
          JSON.stringify({ success: true, message: 'Thread not found' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const ambassador = thread.ambassador_profiles as any;
      const messageContent = extractMessageContent(emailText);
      
      // Determine direction and route accordingly
      if (senderEmail.toLowerCase() === thread.recipient_email.toLowerCase()) {
        // Reply from original recipient → route to ambassador's personal inbox
        console.log('[Ambassador Thread] Routing recipient reply to ambassador personal email');
        
        // Log inbound message
        await supabase.from('ambassador_email_messages').insert({
          thread_id: thread.id,
          direction: 'inbound',
          sender_email: senderEmail,
          recipient_email: ambassador.personal_email,
          subject: subject,
          message_content: messageContent,
        });
        
        // Send to ambassador's personal email via Resend
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${senderEmail} <reply-${threadKey}@bestdayministries.org>`,
            to: ambassador.personal_email,
            subject: subject || `Re: ${thread.subject}`,
            text: messageContent,
            reply_to: `reply-${threadKey}@bestdayministries.org`,
          }),
        });
        
        if (!resendResponse.ok) {
          throw new Error(`Failed to forward to ambassador: ${await resendResponse.text()}`);
        }
        
        console.log('[Ambassador Thread] Successfully routed to ambassador');
        
      } else if (senderEmail.toLowerCase() === ambassador.personal_email.toLowerCase()) {
        // Reply from ambassador's personal email → send to original recipient
        console.log('[Ambassador Thread] Routing ambassador reply to recipient');
        
        // Log outbound message
        await supabase.from('ambassador_email_messages').insert({
          thread_id: thread.id,
          direction: 'outbound',
          sender_email: ambassador.ambassador_email,
          recipient_email: thread.recipient_email,
          subject: subject,
          message_content: messageContent,
        });
        
        // Send to recipient via Resend
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: ambassador.ambassador_email,
            to: thread.recipient_email,
            subject: subject || `Re: ${thread.subject}`,
            text: messageContent,
            reply_to: `reply-${threadKey}@bestdayministries.org`,
          }),
        });
        
        if (!resendResponse.ok) {
          throw new Error(`Failed to send to recipient: ${await resendResponse.text()}`);
        }
        
        console.log('[Ambassador Thread] Successfully sent to recipient');
        
      } else {
        console.error('[Ambassador Thread] Unknown sender:', senderEmail);
      }
      
      // Update thread last message timestamp
      await supabase
        .from('ambassador_email_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', thread.id);
      
      return new Response(
        JSON.stringify({ success: true, thread_key: threadKey }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    // ========== END AMBASSADOR EMAIL THREAD HANDLING ==========

    // Find matching submission by sender email
    const { data: submissions, error: submissionsError } = await supabase
      .from('contact_form_submissions')
      .select('id, name, email, subject, created_at')
      .eq('email', senderEmail)
      .order('created_at', { ascending: false })
      .limit(5);

    if (submissionsError) {
      throw new Error(`Failed to query submissions: ${submissionsError.message}`);
    }

    // Check if this is a reply vs new email:
    // - If subject contains "Re:" or "RE:" → it's a reply
    // - If it matches an existing submission's subject → likely a reply
    // - Otherwise → treat as new email
    const isReply = subject && (
      subject.toLowerCase().startsWith('re:') || 
      subject.toLowerCase().startsWith('fwd:')
    );
    
    let matchedSubmission = null;
    
    if (isReply && submissions && submissions.length > 0) {
      // Try to match by subject for replies
      if (subject) {
        const cleanSubject = subject.replace(/^(re:|fwd:)\s*/i, '').toLowerCase();
        matchedSubmission = submissions.find(s => 
          s.subject && cleanSubject.includes(s.subject.toLowerCase())
        );
      }
      // If no subject match, use most recent submission
      if (!matchedSubmission) {
        matchedSubmission = submissions[0];
      }
    }

    if (!matchedSubmission) {
      console.log('[process-inbound-email] No matching submission found');
      
      // ALWAYS create a new submission for incoming emails
      // This ensures no emails are lost and all correspondence is tracked
      console.log('[process-inbound-email] Creating new submission for email from:', senderEmail);
      
      // Extract clean message content for new submission
      const messageContent = extractMessageContent(emailText);
      if (!messageContent || messageContent.trim().length === 0) {
        throw new Error('No message content found in email');
      }
      
      // Use sender name from raw headers if available
      let senderName = senderNameFromHeaders || '';
      
      // If no name from headers, try to get name from payload.from
      if (!senderName && payload.from.includes('<')) {
        const namePart = payload.from.split('<')[0].trim().replace(/['"]/g, '');
        // Only use if it's not a Cloudflare ID (long hex string)
        if (namePart && !/^[0-9a-f-]{30,}$/i.test(namePart)) {
          senderName = namePart;
        }
      }
      
      // If still no good name, make a friendly name from email
      if (!senderName) {
        const localPart = senderEmail.split('@')[0];
        // Check if it's a Cloudflare bounce ID
        if (/^[0-9a-f-]{30,}$/i.test(localPart)) {
          senderName = 'Email Sender';
        } else {
          // Capitalize and clean up the email local part
          senderName = localPart
            .replace(/[._-]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
      }
      
      console.log('[process-inbound-email] Final sender name:', senderName);
      
      // Extract CC emails from the inbound email
      let ccEmails: string[] = [];
      if (payload.cc) {
        ccEmails = extractCcEmails(payload.cc);
        console.log('[process-inbound-email] CC emails found:', ccEmails);
      }
      if (payload.raw) {
        const rawCcEmails = extractCcFromRaw(payload.raw);
        if (rawCcEmails.length > 0) {
          ccEmails = [...new Set([...ccEmails, ...rawCcEmails])]; // Dedupe
          console.log('[process-inbound-email] CC emails from raw:', ccEmails);
        }
      }
      
      // Create new contact form submission
      const { data: newSubmission, error: insertError } = await supabase
        .from('contact_form_submissions')
        .insert({
          email: senderEmail,
          name: senderName,
          subject: subject || 'Email to Contact',
          message: messageContent,
          status: 'new',
          message_type: 'general',
          source: 'email',
          cc_emails: ccEmails.length > 0 ? ccEmails : []
        })
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Failed to create submission: ${insertError.message}`);
      }
      
      console.log('[process-inbound-email] New submission created:', newSubmission.id);
      
      // Notify admins of new inbound email
      try {
        await fetch(`${supabaseUrl}/functions/v1/notify-admins-new-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            type: 'inbound_email',
            senderName: senderName,
            senderEmail: senderEmail,
            subject: subject || 'Email to Contact',
            messagePreview: messageContent.substring(0, 200),
            submissionId: newSubmission.id,
          }),
        });
        console.log('[process-inbound-email] Admin notification sent');
      } catch (notifyError) {
        console.error('[process-inbound-email] Failed to notify admins:', notifyError);
        // Don't fail the whole request if notification fails
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          submission_id: newSubmission.id,
          created: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[process-inbound-email] Matched submission:', matchedSubmission.id);

    // Extract clean message content
    const messageContent = extractMessageContent(emailText);
    if (!messageContent || messageContent.trim().length === 0) {
      throw new Error('No message content found in email');
    }

    console.log('[process-inbound-email] Extracted message length:', messageContent.length);

    // Save reply to database
    const { error: insertError } = await supabase
      .from('contact_form_replies')
      .insert({
        submission_id: matchedSubmission.id,
        sender_type: 'user',
        sender_id: null, // User replies don't have a sender_id
        sender_name: matchedSubmission.name,
        sender_email: senderEmail,
        message: messageContent,
      });

    if (insertError) {
      throw new Error(`Failed to insert reply: ${insertError.message}`);
    }
    
    // Reset status to 'new' and replied_at to null so the thread shows as unread
    // This ensures admins always see there's a new message requiring attention
    const { error: updateError } = await supabase
      .from('contact_form_submissions')
      .update({ replied_at: null, status: 'new' })
      .eq('id', matchedSubmission.id);
    
    if (updateError) {
      console.error('[process-inbound-email] Failed to reset replied_at:', updateError);
      // Don't throw - the reply was saved, this is just for badge tracking
    }

    console.log('[process-inbound-email] Reply saved successfully');

    // Notify admins of new reply
    try {
      await fetch(`${supabaseUrl}/functions/v1/notify-admins-new-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          type: 'inbound_email',
          senderName: matchedSubmission.name,
          senderEmail: senderEmail,
          subject: subject || `Re: ${matchedSubmission.subject}`,
          messagePreview: messageContent.substring(0, 200),
          submissionId: matchedSubmission.id,
        }),
      });
      console.log('[process-inbound-email] Admin notification sent for reply');
    } catch (notifyError) {
      console.error('[process-inbound-email] Failed to notify admins:', notifyError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        submission_id: matchedSubmission.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[process-inbound-email] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 200, // Return 200 to prevent Resend from retrying
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Parse raw email content (from Cloudflare Email Worker)
 */
function parseRawEmail(raw: string): string {
  try {
    // Simple parsing - extract body after headers
    const bodyMatch = raw.match(/\r?\n\r?\n([\s\S]+)/);
    if (bodyMatch) {
      return bodyMatch[1];
    }
    return raw;
  } catch (error) {
    console.error('[parseRawEmail] Error:', error);
    return raw;
  }
}

/**
 * Extract original sender from raw email headers
 * Cloudflare rewrites the 'from' field, but preserves original in raw headers
 */
function extractOriginalSender(raw: string): { email: string; name: string } | null {
  try {
    // Extract headers section (before the double newline)
    const headersMatch = raw.match(/^([\s\S]*?)\r?\n\r?\n/);
    if (!headersMatch) return null;
    
    const headers = headersMatch[1];
    
    // Try to find Reply-To first (most reliable for the actual sender)
    const replyToMatch = headers.match(/^Reply-To:\s*(.+)$/mi);
    if (replyToMatch) {
      const replyTo = replyToMatch[1].trim();
      const email = extractEmail(replyTo);
      const name = extractNameFromHeader(replyTo);
      if (email && !email.includes('@send.bestdayministries.org')) {
        console.log('[extractOriginalSender] Found Reply-To:', { email, name });
        return { email, name };
      }
    }
    
    // Try to find From header
    const fromMatch = headers.match(/^From:\s*(.+)$/mi);
    if (fromMatch) {
      const fromHeader = fromMatch[1].trim();
      const email = extractEmail(fromHeader);
      const name = extractNameFromHeader(fromHeader);
      if (email && !email.includes('@send.bestdayministries.org')) {
        console.log('[extractOriginalSender] Found From:', { email, name });
        return { email, name };
      }
    }
    
    // Try X-Original-From header (some email systems use this)
    const originalFromMatch = headers.match(/^X-Original-From:\s*(.+)$/mi);
    if (originalFromMatch) {
      const originalFrom = originalFromMatch[1].trim();
      const email = extractEmail(originalFrom);
      const name = extractNameFromHeader(originalFrom);
      if (email) {
        console.log('[extractOriginalSender] Found X-Original-From:', { email, name });
        return { email, name };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[extractOriginalSender] Error:', error);
    return null;
  }
}

/**
 * Extract name from email header like "John Doe <john@example.com>" or "john@example.com"
 */
function extractNameFromHeader(header: string): string {
  // Check for "Name <email>" format
  if (header.includes('<')) {
    const namePart = header.split('<')[0].trim().replace(/['"]/g, '');
    // Skip if it's a Cloudflare ID (long hex string)
    if (namePart && !/^[0-9a-f-]{30,}$/i.test(namePart)) {
      return namePart;
    }
  }
  
  // Extract from email address local part
  const email = extractEmail(header);
  if (email) {
    const localPart = email.split('@')[0];
    // Skip if it's a Cloudflare ID
    if (/^[0-9a-f-]{30,}$/i.test(localPart)) {
      return '';
    }
    // Format local part as name
    return localPart
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return '';
}

/**
 * Extract email address from "Name <email@example.com>" format
 */
function extractEmail(from: string): string | null {
  const match = from.match(/<(.+?)>/);
  if (match) {
    return match[1].toLowerCase();
  }
  // If no angle brackets, assume it's just the email
  return from.toLowerCase();
}

/**
 * Extract CC email addresses from a CC header string
 */
function extractCcEmails(ccString: string): string[] {
  if (!ccString || ccString.trim() === '') return [];
  
  const emails: string[] = [];
  // Split by comma, handling cases like "Name <email>, Other <email2>"
  const parts = ccString.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const email = extractEmail(trimmed);
    if (email && !email.includes('@send.bestdayministries.org')) {
      emails.push(email);
    }
  }
  
  return emails;
}

/**
 * Extract CC emails from raw email headers
 */
function extractCcFromRaw(raw: string): string[] {
  try {
    // Find CC header in raw email
    const ccMatch = raw.match(/^Cc:\s*(.+)$/mi);
    if (ccMatch) {
      return extractCcEmails(ccMatch[1]);
    }
    return [];
  } catch (error) {
    console.error('[extractCcFromRaw] Error:', error);
    return [];
  }
}

/**
 * Extract clean message content from email body
 * Attempts to remove quoted replies, signatures, and other noise
 */
function extractMessageContent(content: string): string {
  // Remove HTML tags if present
  let text = content.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Handle MIME multipart boundaries - more robust parsing
  // Match patterns like --_000_BY1PR06MB909466DE7368... or --000000000000...
  // First try to extract text/plain content
  const textPlainMatch = text.match(/Content-Type:\s*text\/plain[^\n]*(?:\n[^\n]+)*\n\n([\s\S]*?)(?=--[_\-0-9a-zA-Z]+|$)/i);
  if (textPlainMatch && textPlainMatch[1]) {
    text = textPlainMatch[1];
  }
  
  // Remove all MIME boundary markers (various formats)
  // Match patterns like: --_000_xxx, --000000000, --boundary_xxx, etc.
  text = text.replace(/--[_]?[0-9a-zA-Z]+[_]?[0-9a-zA-Z]*--?\s*/g, '');
  text = text.replace(/--[_\-0-9a-zA-Z]{10,}[^\n]*\n?/g, ''); // Long boundary markers
  
  // Remove MIME headers that might still be present
  text = text.replace(/Content-Type:[^\n]*\n/gi, '');
  text = text.replace(/Content-Transfer-Encoding:[^\n]*\n/gi, '');
  text = text.replace(/Content-Disposition:[^\n]*\n/gi, '');
  text = text.replace(/MIME-Version:[^\n]*\n/gi, '');
  text = text.replace(/charset=[^\s;]+;?/gi, '');
  
  // Remove quoted-printable soft line breaks
  text = text.replace(/=\r?\n/g, '');
  text = text.replace(/=([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Split by common reply separators
  const separators = [
    /^On .+ wrote:$/m,
    /^-{3,}$/m, // Lines with multiple dashes
    /^_{3,}$/m, // Lines with multiple underscores
    /^From: .+$/m,
    /^Sent: .+$/m,
    /^To: .+$/m,
    /^Subject: .+$/m,
    /^Date: .+$/m,
  ];
  
  let cleanText = text;
  for (const separator of separators) {
    const parts = cleanText.split(separator);
    if (parts.length > 1) {
      cleanText = parts[0];
      break;
    }
  }
  
  // Remove common email signatures
  const signaturePatterns = [
    /^--\s*$/m,
    /^Sent from my /m,
    /^Get Outlook for /m,
  ];
  
  for (const pattern of signaturePatterns) {
    const parts = cleanText.split(pattern);
    if (parts.length > 1) {
      cleanText = parts[0];
      break;
    }
  }
  
  // Clean up whitespace
  return cleanText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}
