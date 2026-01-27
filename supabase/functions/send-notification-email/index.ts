import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SITE_URL, SENDERS } from "../_shared/domainConstants.ts";

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

// Generate customized email content based on notification type
const generateEmailContent = (
  requestData: NotificationEmailRequest,
  displayName: string
): { title: string; message: string; actionText: string } => {
  let emailTitle = requestData.title;
  let emailMessage = requestData.message;
  let actionText = "View Details";

  switch (requestData.notificationType) {
    case "approval_decision":
      const status = requestData.metadata?.status || "approved";
      const itemType = requestData.metadata?.itemType || "post";
      emailTitle = status === 'approved' 
        ? `Your ${itemType} was approved! 🎉`
        : `Your ${itemType} needs revision`;
      emailMessage = status === 'approved'
        ? `Great news! Your ${itemType}${requestData.metadata?.itemTitle ? ` "${requestData.metadata.itemTitle}"` : ''} has been approved and is now visible to the community.`
        : `Your ${itemType}${requestData.metadata?.itemTitle ? ` "${requestData.metadata.itemTitle}"` : ''} was reviewed and needs some changes before it can be published. Please check the feedback and resubmit.`;
      actionText = `View ${itemType}`;
      break;

    case "new_sponsor_message":
      emailTitle = "You have a new message! 💌";
      const senderName = requestData.metadata?.senderName || "A sponsor";
      const messageSubject = requestData.metadata?.messageSubject;
      emailMessage = `${senderName} sent you a message${messageSubject ? ` about "${messageSubject}"` : ''}:\n\n${requestData.message.substring(0, 200)}${requestData.message.length > 200 ? '...' : ''}`;
      actionText = "Read Message";
      break;

    case "message_approved":
      emailTitle = "Your message was approved! ✅";
      emailMessage = `Your message to sponsors has been approved and delivered.`;
      actionText = "View Messages";
      break;

    case "message_rejected":
      emailTitle = "Your message needs revision";
      emailMessage = `Your message to sponsors was reviewed and needs changes. Reason: ${requestData.metadata?.reason || 'Please see feedback'}`;
      actionText = "View Messages";
      break;

    case "new_sponsorship":
      emailTitle = "New Sponsorship! 🎉";
      const frequency = requestData.metadata?.frequency === 'monthly' ? 'monthly' : 'one-time';
      const amount = requestData.metadata?.amount || 0;
      const sponsorName = requestData.metadata?.sponsorName || "A supporter";
      const bestieName = requestData.metadata?.bestieName || displayName;
      emailMessage = `${sponsorName} has started a ${frequency} sponsorship of $${amount.toFixed(2)} for ${bestieName}. Thank you for your support!`;
      actionText = "View Sponsorship";
      break;

    case "sponsorship_update":
      emailTitle = "Sponsorship Updated 💝";
      emailMessage = requestData.message;
      actionText = "View Sponsorships";
      break;

    case "comment_on_post":
      emailTitle = "New comment on your post 💬";
      const commenterPost = requestData.metadata?.commenterName || "Someone";
      const postTitle = requestData.metadata?.postTitle || "your post";
      emailMessage = `${commenterPost} commented on "${postTitle}":\n\n${requestData.message.substring(0, 200)}${requestData.message.length > 200 ? '...' : ''}`;
      actionText = "View Comment";
      break;

    case "comment_on_thread":
      emailTitle = "New reply on a discussion you're following 💬";
      const commenterThread = requestData.metadata?.commenterName || "Someone";
      const threadTitle = requestData.metadata?.postTitle || "a discussion";
      emailMessage = `${commenterThread} also commented on "${threadTitle}":\n\n${requestData.message.substring(0, 200)}${requestData.message.length > 200 ? '...' : ''}`;
      actionText = "View Comment";
      break;

    case "new_event":
      emailTitle = `New Event: ${requestData.metadata?.eventTitle || requestData.title} 📅`;
      const eventDate = requestData.metadata?.eventDate || '';
      const eventLocation = requestData.metadata?.eventLocation;
      emailMessage = `${requestData.message}\n\nWhen: ${eventDate}${eventLocation ? `\nWhere: ${eventLocation}` : ''}`;
      actionText = "View Event Details";
      break;

    case "event_update":
      emailTitle = `Event Update: ${requestData.metadata?.eventTitle || requestData.title} 📅`;
      emailMessage = requestData.message;
      actionText = "View Event Details";
      break;

    case "pending_approval":
      emailTitle = "New content awaiting your approval";
      emailMessage = requestData.message;
      actionText = "Review Now";
      break;

    case "prayer_expiring":
      emailTitle = "Your prayer request is expiring soon 🙏";
      emailMessage = requestData.message;
      actionText = "Renew Prayer";
      break;

    case "prayer_pending_approval":
      emailTitle = "Prayer request awaiting approval";
      emailMessage = requestData.message;
      actionText = "Review Prayer";
      break;

    case "prayer_approved":
      emailTitle = "Your prayer request was approved! 🎉";
      emailMessage = `Your prayer request has been approved and is now visible to the community.`;
      actionText = "View Prayer";
      break;

    case "prayer_rejected":
      emailTitle = "Your prayer request needs revision";
      emailMessage = requestData.message;
      actionText = "Review Feedback";
      break;

    case "prayed_for_you":
      emailTitle = "Someone prayed for you! 💙";
      const prayerName = requestData.metadata?.prayerName || "Someone";
      emailMessage = `${prayerName} prayed for your prayer request "${requestData.metadata?.prayerTitle || 'your request'}".`;
      actionText = "View Prayer";
      break;

    case "content_like":
      emailTitle = "Someone liked your creation! ❤️";
      const likerName = requestData.metadata?.likerName || "Someone";
      emailMessage = requestData.message || `${likerName} liked your content.`;
      actionText = "View Creation";
      break;

    case "order_shipped":
      emailTitle = "Your order has shipped! 📦";
      const productName = requestData.metadata?.productName || "Your item";
      const trackingNumber = requestData.metadata?.trackingNumber;
      emailMessage = `${productName} is on its way!${trackingNumber ? `\n\nTracking: ${trackingNumber}` : ''}`;
      actionText = "Track Order";
      break;

    case "order_delivered":
      emailTitle = "Your order was delivered! 🎉";
      const deliveredProduct = requestData.metadata?.productName || "Your item";
      emailMessage = `${deliveredProduct} has arrived! We hope you love it.`;
      actionText = "View Order";
      break;

    case "badge_earned":
      emailTitle = "Achievement Unlocked! 🏆";
      const badgeName = requestData.metadata?.badgeName || "a badge";
      emailMessage = `Congratulations! You earned the ${badgeName} badge!`;
      actionText = "View Achievement";
      break;
  }

  return { title: emailTitle, message: emailMessage, actionText };
};

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

    const prefs = preferences?.[0] || {};

    // PRIORITY 4 FIX: Check if instant email notifications are globally disabled FIRST
    // Check for enable_instant_emails preference from notification_preferences table
    const { data: notifPrefs } = await supabase
      .from("notification_preferences")
      .select("enable_instant_emails")
      .eq("user_id", requestData.userId)
      .maybeSingle();
    
    if (notifPrefs && notifPrefs.enable_instant_emails === false) {
      console.log(`Instant email notifications globally disabled for user ${requestData.userId}`);
      
      // Log the skipped email
      try {
        await supabase
          .from("email_notifications_log")
          .insert({
            user_id: requestData.userId,
            recipient_email: profile.email,
            notification_type: requestData.notificationType,
            subject: requestData.subject,
            status: "skipped",
            metadata: { reason: "instant_emails_disabled" }
          });
      } catch (logError) {
        console.error("Error logging skipped email:", logError);
      }
      
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Instant email notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      new_event: "email_on_new_event",
      event_update: "email_on_event_update",
      prayer_expiring: "email_on_prayer_expiring",
      prayer_pending_approval: "email_on_prayer_pending_approval",
      prayer_approved: "email_on_prayer_approved",
      prayer_rejected: "email_on_prayer_rejected",
      prayed_for_you: "email_on_prayed_for_you",
      content_like: "email_on_content_like",
      order_shipped: "email_on_order_shipped",
      order_delivered: "email_on_order_delivered",
      badge_earned: "email_on_badge_earned",
    };

    const preferenceField = preferenceMap[requestData.notificationType];
    const shouldSendEmail = preferenceField ? prefs[preferenceField] !== false : true;

    if (!shouldSendEmail) {
      console.log(`Email notifications disabled for ${requestData.notificationType}`);
      
      // Log the skipped email
      try {
        await supabase
          .from("email_notifications_log")
          .insert({
            user_id: requestData.userId,
            recipient_email: profile.email,
            notification_type: requestData.notificationType,
            subject: requestData.subject,
            status: "skipped",
            metadata: { reason: "type_specific_disabled" }
          });
      } catch (logError) {
        console.error("Error logging skipped email:", logError);
      }
      
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User preference" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get app logo
    const { data: appSettings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = appSettings?.setting_value || "";
    const actionUrl = requestData.link ? `${SITE_URL}${requestData.link}` : SITE_URL;

    // Generate customized email content
    const { title, message, actionText } = generateEmailContent(requestData, profile.display_name);

    // Build email HTML with improved styling
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
                        ${title}
                      </h1>
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a; white-space: pre-line;">
                        ${message}
                      </p>
                      ${requestData.link ? `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${actionUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                              ${actionText}
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
                        <a href="${SITE_URL}/profile" style="color: #888888; text-decoration: underline;">Manage preferences</a>
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
      from: SENDERS.notifications,
      to: [profile.email],
      subject: requestData.subject,
      html,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      
      // Log failure (graceful handling - don't fail if logging fails)
      try {
        await supabase.from("email_notifications_log").insert({
          user_id: requestData.userId,
          recipient_email: profile.email,
          notification_type: requestData.notificationType,
          subject: requestData.subject,
          status: "failed",
          error_message: emailError.message,
          metadata: requestData.metadata,
        });
      } catch (logError) {
        console.error("Error logging email failure:", logError);
      }

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    // Log success (graceful handling - don't fail if logging fails)
    try {
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
    } catch (logError) {
      console.error("Error logging email success:", logError);
    }

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