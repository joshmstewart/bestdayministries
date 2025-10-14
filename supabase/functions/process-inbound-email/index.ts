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
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[process-inbound-email] Received webhook');

    const payload: InboundEmailPayload = await req.json();
    console.log('[process-inbound-email] Payload:', {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      has_html: !!payload.html,
      has_text: !!payload.text,
    });

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
      .select('id, name, email, subject')
      .eq('email', senderEmail)
      .order('created_at', { ascending: false })
      .limit(5);

    if (submissionsError) {
      throw new Error(`Failed to query submissions: ${submissionsError.message}`);
    }

    if (!submissions || submissions.length === 0) {
      console.log('[process-inbound-email] No matching submission found for email:', senderEmail);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No matching submission found' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to match submission by subject or use most recent
    let matchedSubmission = submissions[0];
    if (payload.subject) {
      const subjectMatch = submissions.find(s => 
        s.subject && payload.subject.toLowerCase().includes(s.subject.toLowerCase())
      );
      if (subjectMatch) {
        matchedSubmission = subjectMatch;
      }
    }

    console.log('[process-inbound-email] Matched submission:', matchedSubmission.id);

    // Extract clean message content
    const messageContent = extractMessageContent(payload.text || payload.html || '');
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
