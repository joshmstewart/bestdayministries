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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MessageNotificationRequest {
  messageId: string;
  recipientId: string;
  notificationType: 'new_message' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, recipientId, notificationType, rejectionReason }: MessageNotificationRequest = await req.json();

    console.log(`Processing message notification for user ${recipientId}, type: ${notificationType}`);

    // Get recipient's email and notification preferences
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", recipientId)
      .single();

    if (recipientError || !recipient?.email) {
      console.error("Error fetching recipient:", recipientError);
      return new Response(
        JSON.stringify({ error: "Recipient not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const { data: prefs } = await supabaseAdmin
      .rpc("get_notification_preferences", { _user_id: recipientId });

    let shouldSend = false;
    if (notificationType === 'new_message' && prefs?.[0]?.email_on_new_sponsor_message) {
      shouldSend = true;
    } else if (notificationType === 'approved' && prefs?.[0]?.email_on_message_approved) {
      shouldSend = true;
    } else if (notificationType === 'rejected' && prefs?.[0]?.email_on_message_rejected) {
      shouldSend = true;
    }

    if (!shouldSend) {
      console.log("Recipient has disabled this notification type");
      return new Response(
        JSON.stringify({ message: "Notification disabled by user preference" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get message details
    const { data: message, error: messageError } = await supabaseAdmin
      .from("sponsor_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (messageError) {
      console.error("Error fetching message:", messageError);
      return new Response(
        JSON.stringify({ error: "Message not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender and bestie names
    const { data: sender } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", message.sent_by)
      .single();

    const { data: bestie } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", message.bestie_id)
      .single();


    // Get app settings for branding
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = settings?.setting_value || "";

    // Build email content based on notification type
    let subject = "";
    let content = "";
    // Sponsors view messages on /guardian-links (My Sponsorships section)
    // Besties view/send messages on /bestie-messages
    let actionUrl = `${SITE_URL}/guardian-links`;

    switch (notificationType) {
      case 'new_message':
        subject = `💌 New Message from ${sender?.display_name || 'Sponsor'}`;
        content = `
          <p>You have a new message from <strong>${sender?.display_name || 'a sponsor'}</strong>!</p>
          <div class="preview">
            <strong>Subject:</strong> ${message.subject || 'No subject'}<br/>
            <strong>Message:</strong><br/>
            ${message.message?.substring(0, 200)}${message.message?.length > 200 ? '...' : ''}
          </div>
          <p>Log in to view the full message and respond.</p>
        `;
        break;
      case 'approved':
        subject = `✅ Your Message Was Approved`;
        content = `
          <p>Good news! Your message to sponsors has been approved by your guardian.</p>
          <div class="preview">
            <strong>Subject:</strong> ${message.subject || 'No subject'}
          </div>
          <p>Your message will now be delivered to your sponsors.</p>
        `;
        actionUrl = `${SITE_URL}/bestie-messages`;
        break;
      case 'rejected':
        subject = `❌ Your Message Needs Revision`;
        content = `
          <p>Your guardian has reviewed your message and requested some changes.</p>
          <div class="preview">
            <strong>Subject:</strong> ${message.subject || 'No subject'}
            ${rejectionReason ? `<br/><br/><strong>Feedback:</strong><br/>${rejectionReason}` : ''}
          </div>
          <p>Please review the feedback and submit a revised message.</p>
        `;
        actionUrl = `${SITE_URL}/bestie-messages`;
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
              <h1>👋 Hi ${recipient.display_name || 'there'}!</h1>
              
              ${content}
              
              <div style="text-align: center;">
                <a href="${actionUrl}" class="button">View Message</a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                You're receiving this email because of your account settings. 
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
      to: [recipient.email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the notification
    await supabaseAdmin
      .from("email_notifications_log")
      .insert({
        user_id: recipientId,
        recipient_email: recipient.email,
        notification_type: `message_${notificationType}`,
        subject: subject,
        status: "sent",
        metadata: {
          message_id: messageId,
          notification_type: notificationType
        }
      });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-message-notification:", error);
    
    // Log the error
    try {
      const body = await req.json();
      await supabaseAdmin
        .from("email_notifications_log")
        .insert({
          user_id: body.recipientId,
          recipient_email: "error@unknown.com",
          notification_type: "message_error",
          subject: "Error",
          status: "failed",
          error_message: error.message
        });
    } catch (logError) {
      console.error("Error logging notification failure:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
