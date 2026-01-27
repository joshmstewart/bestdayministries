import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SITE_URL } from "../_shared/domainConstants.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminRequest {
  submissionId?: string;
  userEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { submissionId, userEmail }: NotifyAdminRequest = await req.json();

    console.log("[notify-admin-new-contact] Processing submission:", submissionId || `email: ${userEmail}`);

    // Get submission details - either by ID or latest by email
    let submission;
    let submissionError;

    if (submissionId) {
      const result = await supabase
        .from("contact_form_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();
      submission = result.data;
      submissionError = result.error;
    } else if (userEmail) {
      const result = await supabase
        .from("contact_form_submissions")
        .select("*")
        .eq("email", userEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      submission = result.data;
      submissionError = result.error;
    }

    if (submissionError || !submission) {
      console.error("[notify-admin-new-contact] Submission not found:", submissionError);
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin email from contact form settings
    const { data: settings } = await supabase
      .from("contact_form_settings")
      .select("recipient_email")
      .single();

    const settingsEmail = settings?.recipient_email;

    // Get all admin/owner user IDs
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);

    // Get emails for those users from profiles
    const adminUserIds = (adminRoles || []).map(r => r.user_id);
    let adminEmails: string[] = [];
    
    if (adminUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", adminUserIds);
      
      adminEmails = (profiles || [])
        .map(p => p.email)
        .filter((email): email is string => !!email && !email.match(/^test\d*@example\.com$/));
    }

    // Combine settings email with admin emails, deduplicate
    const allRecipients = new Set<string>();
    if (settingsEmail) allRecipients.add(settingsEmail);
    adminEmails.forEach(email => allRecipients.add(email));
    
    // Fallback if no recipients found
    if (allRecipients.size === 0) {
      const fallback = Deno.env.get("ADMIN_EMAIL") || "admin@example.com";
      allRecipients.add(fallback);
    }

    const recipientList = Array.from(allRecipients);
    console.log("[notify-admin-new-contact] Sending to recipients:", recipientList);

    // Get app logo
    const { data: appSettings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = appSettings?.setting_value ? JSON.parse(appSettings.setting_value) : "";
    const viewUrl = `${SITE_URL}/admin?tab=contact`;

    // Format message type
    const messageType = (submission.message_type || "general").replace(/_/g, " ");
    const typeColor = submission.message_type === "bug_report" ? "#ef4444" :
                      submission.message_type === "feature_request" ? "#3b82f6" :
                      "#6b7280";

    // Build email HTML with no-reply warning
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- No-reply warning banner -->
                  <tr>
                    <td style="padding: 15px 20px; background: #fff3e0; border-left: 4px solid #ff9800;">
                      <p style="margin: 0; font-weight: bold; color: #e65100;">
                        ⚠️ This is an automated notification. Do not reply to this email.
                      </p>
                      <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                        To respond, please log in to the Best Day Ever platform.
                      </p>
                    </td>
                  </tr>
                  ${logoUrl ? `
                  <tr>
                    <td align="center" style="padding: 30px 20px 20px;">
                      <img src="${logoUrl}" alt="Logo" style="max-width: 150px; height: auto;">
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 20px 40px;">
                      <h1 style="margin: 0 0 10px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                        New Contact Form Submission
                      </h1>
                      <div style="margin-bottom: 20px;">
                        <span style="display: inline-block; padding: 4px 12px; background-color: ${typeColor}; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                          ${messageType}
                        </span>
                      </div>
                      
                      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #f97316; border-radius: 4px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                          <strong style="color: #1a1a1a;">From:</strong> ${submission.name}
                        </p>
                        <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                          <strong style="color: #1a1a1a;">Email:</strong> 
                          <a href="mailto:${submission.email}" style="color: #f97316; text-decoration: none;">${submission.email}</a>
                        </p>
                        ${submission.subject ? `
                        <p style="margin: 0; font-size: 14px; color: #666;">
                          <strong style="color: #1a1a1a;">Subject:</strong> ${submission.subject}
                        </p>
                        ` : ''}
                      </div>

                      <div style="margin: 20px 0;">
                        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #1a1a1a;">Message:</p>
                        <div style="padding: 15px; background-color: #f9f9f9; border-radius: 4px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
${submission.message}
                        </div>
                      </div>

                      ${submission.image_url ? `
                      <div style="margin: 20px 0;">
                        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #1a1a1a;">Attached Image:</p>
                        <img src="${submission.image_url}" alt="Attachment" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #e0e0e0;">
                      </div>
                      ` : ''}

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${viewUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                              View & Respond in Platform
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Important no-reply reminder -->
                  <tr>
                    <td style="padding: 15px 40px; background-color: #ffebee;">
                      <p style="margin: 0; color: #c62828; font-size: 13px; text-align: center;">
                        <strong>Important:</strong> Replies to this email will not be delivered. 
                        Please use the button above to respond through the platform.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 14px; color: #888888; text-align: center;">
                        This notification was sent automatically when a new contact form submission was received.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email (no reply_to to prevent accidental replies to noreply address)
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Best Day Ever Notifications <noreply@bestdayministries.org>",
      to: recipientList,
      subject: `[Action Required] New ${messageType} submission from ${submission.name}`,
      html,
    });

    if (emailError) {
      console.error("[notify-admin-new-contact] Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[notify-admin-new-contact] Email sent successfully:", emailData);

    // Log to universal email audit trail
    try {
      await supabase.from('email_audit_log').insert({
        resend_email_id: emailData?.id,
        email_type: 'admin_notification',
        recipient_email: recipientList.join(', '),
        from_email: "noreply@bestdayministries.org",
        from_name: "Best Day Ever Notifications",
        subject: `[Action Required] New ${messageType} submission from ${submission.name}`,
        html_content: html,
        status: 'sent',
        related_id: submission.id,
        related_type: 'contact_submission',
        sent_at: new Date().toISOString(),
        metadata: { message_type: submission.message_type, sender_email: submission.email }
      });
    } catch (logError) {
      console.error('[email-audit] Failed to log email send:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[notify-admin-new-contact] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
