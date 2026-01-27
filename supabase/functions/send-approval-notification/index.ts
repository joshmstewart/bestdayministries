import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { SITE_URL, SENDERS } from "../_shared/domainConstants.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  guardianId: string;
  contentType: 'post' | 'comment' | 'vendor_link' | 'message';
  contentId: string;
  bestieName: string;
  contentPreview?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guardianId, contentType, contentId, bestieName, contentPreview }: ApprovalNotificationRequest = await req.json();

    console.log(`Processing approval notification for guardian ${guardianId}, content type: ${contentType}`);

    // Get guardian's email and notification preferences
    const { data: guardian, error: guardianError } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", guardianId)
      .single();

    if (guardianError || !guardian?.email) {
      console.error("Error fetching guardian:", guardianError);
      return new Response(
        JSON.stringify({ error: "Guardian not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const { data: prefs } = await supabaseAdmin
      .rpc("get_notification_preferences", { _user_id: guardianId });

    if (!prefs?.[0]?.email_on_pending_approval) {
      console.log("Guardian has disabled approval notifications");
      return new Response(
        JSON.stringify({ message: "Notification disabled by user preference" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get app settings for branding
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = settings?.setting_value || "";

    // Build email content based on content type
    let subject = "";
    let contentTypeText = "";
    let actionUrl = `${SITE_URL}/guardian-approvals`;

    switch (contentType) {
      case 'post':
        subject = `New Post Needs Your Approval - ${bestieName}`;
        contentTypeText = "discussion post";
        break;
      case 'comment':
        subject = `New Comment Needs Your Approval - ${bestieName}`;
        contentTypeText = "comment";
        break;
      case 'vendor_link':
        subject = `Vendor Link Request Needs Your Approval - ${bestieName}`;
        contentTypeText = "vendor link request";
        break;
      case 'message':
        subject = `New Message Needs Your Approval - ${bestieName}`;
        contentTypeText = "sponsor message";
        break;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
            .logo { max-width: 200px; height: auto; }
            .content { padding: 30px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .preview { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #FF6B35; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="Logo" class="logo" /></div>` : ''}
            
            <div class="content">
              <h1>👋 Hi ${guardian.display_name || 'Guardian'}!</h1>
              
              <p><strong>${bestieName}</strong> has submitted a new ${contentTypeText} that needs your approval.</p>
              
              ${contentPreview ? `
                <div class="preview">
                  <strong>Preview:</strong><br/>
                  ${contentPreview}
                </div>
              ` : ''}
              
              <p>Please review and approve or reject this content to help keep the community safe and appropriate.</p>
              
              <div style="text-align: center;">
                <a href="${actionUrl}" class="button">Review Now</a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                You're receiving this email because you're a guardian for ${bestieName}. 
                You can manage your notification preferences in your account settings.
              </p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from your community platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: SENDERS.community,
      to: [guardian.email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the notification (graceful handling - don't fail if logging fails)
    try {
      await supabaseAdmin
        .from("email_notifications_log")
        .insert({
          user_id: guardianId,
          recipient_email: guardian.email,
          notification_type: `approval_${contentType}`,
          subject: subject,
          status: "sent",
          metadata: {
            content_id: contentId,
            bestie_name: bestieName,
            content_type: contentType
          }
        });
    } catch (logError) {
      console.error("Error logging approval notification:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-approval-notification:", error);
    
    // Note: Cannot log error to database here since request body was already consumed
    // Error details are already logged to console above

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
