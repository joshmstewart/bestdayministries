import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminRequest {
  submissionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { submissionId }: NotifyAdminRequest = await req.json();

    console.log("[notify-admin-new-contact] Processing submission:", submissionId);

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from("contact_form_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

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

    const adminEmail = settings?.recipient_email || Deno.env.get("ADMIN_EMAIL") || "admin@example.com";

    // Get app logo
    const { data: appSettings } = await supabase
      .from("app_settings_public")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = appSettings?.setting_value || "";
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    const viewUrl = `${appUrl}/admin?tab=contact`;

    // Format message type
    const messageType = (submission.message_type || "general").replace(/_/g, " ");
    const typeColor = submission.message_type === "bug_report" ? "#ef4444" :
                      submission.message_type === "feature_request" ? "#3b82f6" :
                      "#6b7280";

    // Build email HTML
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
                              View in Admin Panel
                            </a>
                          </td>
                        </tr>
                      </table>
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

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Contact Form <notifications@resend.dev>",
      to: [adminEmail],
      reply_to: submission.email,
      subject: `New ${messageType} submission from ${submission.name}`,
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
