import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InboundEmailPayload {
  from: string;
  to: string;
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

    // Extract sender email
    const senderEmail = extractEmail(payload.from);
    if (!senderEmail) {
      throw new Error('Could not extract sender email');
    }

    console.log('[process-inbound-email] Sender email:', senderEmail);

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
      
      // Extract sender name from email or use email as fallback
      const senderName = payload.from.includes('<') 
        ? payload.from.split('<')[0].trim().replace(/['"]/g, '')
        : senderEmail.split('@')[0];
      
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
          source: 'email'
        })
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Failed to create submission: ${insertError.message}`);
      }
      
      console.log('[process-inbound-email] New submission created:', newSubmission.id);
      
      // Note: No notification created here - the contact form submission itself
      // serves as the notification in the contact form UI (badge counter shows new submissions)
      
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

    console.log('[process-inbound-email] Reply saved successfully');

    // Note: No notification created here - the contact form reply
    // shows up in the contact form UI with red dot + badge (unread_user_replies counter)
    
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
  
  // Handle MIME multipart boundaries
  // Look for text/plain content between boundaries
  const textPlainMatch = text.match(/Content-Type:\s*text\/plain[^\n]*\n\n([\s\S]*?)(?:--\d+|$)/i);
  if (textPlainMatch && textPlainMatch[1]) {
    text = textPlainMatch[1];
  }
  
  // Remove MIME headers that might still be present
  text = text.replace(/Content-Type:[^\n]*\n/gi, '');
  text = text.replace(/Content-Transfer-Encoding:[^\n]*\n/gi, '');
  text = text.replace(/--\d{10,}[^\n]*\n/g, ''); // Remove boundary markers
  
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
