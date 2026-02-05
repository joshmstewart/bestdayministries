import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Validation schema for contact form
const contactEmailSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),
  subject: z.string()
    .trim()
    .max(200, "Subject must be less than 200 characters")
    .optional(),
  message: z.string()
    .trim()
    .min(1, "Message is required")
    .max(5000, "Message must be less than 5000 characters"),
});

interface ContactEmailRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Validate input data
    const validationResult = contactEmailSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error('[send-contact-email] Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input data",
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const { name, email, subject, message } = validationResult.data;
    
    // Sanitize HTML in message to prevent XSS
    const sanitizedMessage = message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    
    const sanitizedName = name
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Get recipient email from settings (you could also fetch this from Supabase)
    const recipientEmail = Deno.env.get("CONTACT_RECIPIENT_EMAIL") || "contact@bestdayministries.org";

    const emailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${sanitizedName} (${email})</p>
      ${subject ? `<p><strong>Subject:</strong> ${subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${sanitizedMessage}</p>
      <hr>
      <p><em>This message was sent via the Best Day Ministries contact form.</em></p>
    `;

    const emailResponse = await resend.emails.send({
      from: "Best Day Ministries <contact@bestdayministries.org>",
      to: [recipientEmail],
      reply_to: email,
      subject: subject || `New Contact Form Message from ${sanitizedName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log to universal email audit trail
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    try {
      await supabase.from('email_audit_log').insert({
        resend_email_id: emailResponse.data?.id,
        email_type: 'contact_confirmation',
        recipient_email: email,
        recipient_name: name,
        from_email: "contact@bestdayministries.org",
        from_name: "Best Day Ministries",
        subject: subject || `New Contact Form Message from ${sanitizedName}`,
        html_content: emailHtml,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { contact_name: name }
      });
    } catch (logError) {
      console.error('[email-audit] Failed to log email send:', logError);
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send message. Please try again later.' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
