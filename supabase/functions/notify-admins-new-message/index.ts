import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SITE_URL } from "../_shared/domainConstants.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-ADMINS] ${step}${detailsStr}`);
};

interface NotifyRequest {
  type: 'contact_form' | 'inbound_email';
  senderName: string;
  senderEmail: string;
  subject?: string;
  messagePreview: string;
  submissionId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, senderName: rawSenderName, senderEmail, subject, messagePreview, submissionId }: NotifyRequest = await req.json();
    
    // Clean up sender name - handle Cloudflare IDs and long hex strings
    let senderName = rawSenderName;
    if (!senderName || /^[0-9a-f-]{30,}$/i.test(senderName)) {
      // If name is empty or is a Cloudflare ID, extract from email
      const localPart = senderEmail.split('@')[0];
      if (/^[0-9a-f-]{30,}$/i.test(localPart)) {
        senderName = 'Email Sender';
      } else {
        // Capitalize and clean up the email local part
        senderName = localPart
          .replace(/[._-]/g, ' ')
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }
    
    logStep("Function started", { type, senderName, senderEmail });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all admin/owner emails
    const { data: adminRoles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);

    if (rolesError) {
      throw new Error(`Failed to fetch admin roles: ${rolesError.message}`);
    }

    if (!adminRoles || adminRoles.length === 0) {
      logStep("No admins found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get admin emails from profiles
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("email")
      .in("id", adminUserIds)
      .not("email", "is", null);

    if (profilesError) {
      throw new Error(`Failed to fetch admin profiles: ${profilesError.message}`);
    }

    const adminEmails = profiles?.map(p => p.email).filter(Boolean) || [];
    
    if (adminEmails.length === 0) {
      logStep("No admin emails found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Found admin emails", { count: adminEmails.length });

    const typeLabel = type === 'contact_form' ? 'Contact Form Submission' : 'Inbound Email';
    const truncatedPreview = messagePreview.length > 200 
      ? messagePreview.substring(0, 200) + '...' 
      : messagePreview;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #e65100;">
            ⚠️ This is an automated notification. Do not reply to this email.
          </p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
            To respond, please log in to the Best Day Ever platform.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B4513; margin: 0;">New ${typeLabel} 📬</h1>
          <p style="color: #666; margin-top: 10px;">You have received a new message</p>
        </div>

        <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Message Details</h2>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0; color: #666; width: 80px;"><strong>From:</strong></td>
              <td style="padding: 5px 0;">${senderName} &lt;${senderEmail}&gt;</td>
            </tr>
            ${subject ? `
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Subject:</strong></td>
              <td style="padding: 5px 0;">${subject}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 5px 0; color: #666; vertical-align: top;"><strong>Preview:</strong></td>
              <td style="padding: 5px 0;">${truncatedPreview}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${SITE_URL}/admin?tab=contact" 
             style="display: inline-block; background: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View & Respond in Platform
          </a>
        </div>

        <div style="background: #ffebee; border-radius: 8px; padding: 15px; margin-top: 20px;">
          <p style="margin: 0; color: #c62828; font-size: 13px; text-align: center;">
            <strong>Important:</strong> Replies to this email will not be delivered. 
            Please use the button above to respond through the platform.
          </p>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Best Day Ministries Admin Notification<br>
            This is an automated message from the Best Day Ever platform.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send to all admins
    const emailResponse = await resend.emails.send({
      from: "Best Day Ever Notifications <noreply@bestdayministries.org>",
      to: adminEmails,
      subject: `[Action Required] New ${typeLabel} from ${senderName}`,
      html: emailHtml,
    });

    const emailId = emailResponse?.data?.id || 'unknown';
    logStep("Notification emails sent", { emailId, recipientCount: adminEmails.length });

    // Log to email audit
    await supabaseClient.from("email_audit_log").insert({
      email_type: "admin_notification",
      recipient_email: adminEmails.join(", "),
      subject: `[Action Required] New ${typeLabel} from ${senderName}`,
      from_email: "noreply@bestdayministries.org",
      from_name: "Best Day Ever Notifications",
      status: "sent",
      related_type: type,
      related_id: submissionId || null,
      resend_email_id: emailId,
      sent_at: new Date().toISOString(),
      html_content: emailHtml,
    });

    return new Response(
      JSON.stringify({ success: true, emailId, recipientCount: adminEmails.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
