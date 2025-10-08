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

interface NotificationEmailRequest {
  userId: string;
  notificationType: string;
  subject: string;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: NotificationEmailRequest = await req.json();

    console.log("Processing notification email:", requestData);

    // Get user email and display name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", requestData.userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found or email not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const { data: preferences } = await supabase.rpc("get_notification_preferences", {
      _user_id: requestData.userId,
    });

    if (!preferences || preferences.length === 0) {
      console.log("No preferences found, using defaults (all enabled)");
    }

    const prefs = preferences?.[0] || {};

    // Map notification type to preference field
    const preferenceMap: { [key: string]: string } = {
      pending_approval: "email_on_pending_approval",
      approval_decision: "email_on_approval_decision",
      new_sponsor_message: "email_on_new_sponsor_message",
      message_approved: "email_on_message_approved",
      message_rejected: "email_on_message_rejected",
      new_sponsorship: "email_on_new_sponsorship",
      sponsorship_update: "email_on_sponsorship_update",
      comment_on_post: "email_on_comment_on_post",
      comment_on_thread: "email_on_comment_on_thread",
    };

    const preferenceField = preferenceMap[requestData.notificationType];
    const shouldSendEmail = preferenceField ? prefs[preferenceField] !== false : true;

    if (!shouldSendEmail) {
      console.log(`Email notifications disabled for ${requestData.notificationType}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User preference" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get app logo
    const { data: appSettings } = await supabase
      .from("app_settings_public")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = appSettings?.setting_value || "";
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    const actionUrl = requestData.link ? `${appUrl}${requestData.link}` : appUrl;

    // Build email HTML
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${requestData.subject}</title>
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
                      <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                        ${requestData.title}
                      </h1>
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                        ${requestData.message}
                      </p>
                      ${requestData.link ? `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${actionUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-variant))); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                              View Details
                            </a>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 14px; color: #888888; text-align: center;">
                        You received this email because you have notifications enabled in your settings.
                        <br>
                        <a href="${appUrl}/profile" style="color: #888888; text-decoration: underline;">Manage preferences</a>
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
      from: "Notifications <notifications@resend.dev>",
      to: [profile.email],
      subject: requestData.subject,
      html,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      
      // Log failure
      await supabase.from("email_notifications_log").insert({
        user_id: requestData.userId,
        recipient_email: profile.email,
        notification_type: requestData.notificationType,
        subject: requestData.subject,
        status: "failed",
        error_message: emailError.message,
        metadata: requestData.metadata,
      });

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    // Log success
    await supabase.from("email_notifications_log").insert({
      user_id: requestData.userId,
      recipient_email: profile.email,
      notification_type: requestData.notificationType,
      subject: requestData.subject,
      status: "sent",
      metadata: {
        ...requestData.metadata,
        email_id: emailData?.id,
      },
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
