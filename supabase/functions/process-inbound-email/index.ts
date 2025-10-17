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
      console.log('[process-inbound-email] No matching submission found - creating new submission');
      
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
          message_type: 'general'
        })
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Failed to create submission: ${insertError.message}`);
      }
      
      console.log('[process-inbound-email] New submission created:', newSubmission.id);
      
      // Notify admins about new email submission
      const { data: adminUsers, error: adminsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'owner']);

      if (!adminsError && adminUsers) {
        for (const admin of adminUsers) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            type: 'contact_form_submission',
            title: 'New Email Received',
            message: `${senderName} (${senderEmail}) sent an email`,
            link: '/admin?tab=contact',
            metadata: {
              submission_id: newSubmission.id,
              sender_email: senderEmail,
              source: 'email'
            },
          });
        }
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

    console.log('[process-inbound-email] Reply saved successfully');

    // Notify admins about new user reply
    const { data: adminUsers, error: adminsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'owner']);

    if (!adminsError && adminUsers) {
      for (const admin of adminUsers) {
        await supabase.from('notifications').insert({
          user_id: admin.user_id,
          type: 'contact_form_reply',
          title: 'New Contact Form Reply',
          message: `${matchedSubmission.name} replied to their message`,
          link: '/admin?tab=contact',
          metadata: {
            submission_id: matchedSubmission.id,
            sender_email: senderEmail,
          },
        });
      }
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
