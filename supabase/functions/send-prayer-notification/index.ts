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

interface PrayerNotificationRequest {
  type: 'pending_approval' | 'approved' | 'rejected' | 'prayed_for_you';
  prayerId: string;
  recipientId: string;
  senderName?: string;
  prayerTitle?: string;
  prayerPreview?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, prayerId, recipientId, senderName, prayerTitle, prayerPreview }: PrayerNotificationRequest = await req.json();

    console.log(`Processing prayer notification: type=${type}, prayerId=${prayerId}, recipientId=${recipientId}`);

    // Get recipient's email and profile info
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

    // Determine which preference to check based on type
    let emailEnabled = true;
    let inappEnabled = true;
    
    if (prefs?.[0]) {
      switch (type) {
        case 'pending_approval':
          emailEnabled = prefs[0].email_on_prayer_pending_approval ?? true;
          inappEnabled = prefs[0].inapp_on_prayer_pending_approval ?? true;
          break;
        case 'approved':
          emailEnabled = prefs[0].email_on_prayer_approved ?? true;
          inappEnabled = prefs[0].inapp_on_prayer_approved ?? true;
          break;
        case 'rejected':
          emailEnabled = prefs[0].email_on_prayer_rejected ?? true;
          inappEnabled = prefs[0].inapp_on_prayer_rejected ?? true;
          break;
        case 'prayed_for_you':
          emailEnabled = prefs[0].email_on_prayed_for_you ?? true;
          inappEnabled = prefs[0].inapp_on_prayed_for_you ?? true;
          break;
      }
    }

    // Create in-app notification if enabled
    if (inappEnabled) {
      let notificationTitle = "";
      let notificationMessage = "";
      let notificationType = "";
      let link = "/prayer-requests";

      switch (type) {
        case 'pending_approval':
          notificationTitle = "Prayer Request Needs Approval";
          notificationMessage = `${senderName || 'A bestie'} submitted a prayer request: "${prayerTitle}"`;
          notificationType = "prayer_pending_approval";
          link = "/guardian-approvals";
          break;
        case 'approved':
          notificationTitle = "Prayer Request Approved! 🙏";
          notificationMessage = `Your prayer "${prayerTitle}" has been approved and is now shared with the community.`;
          notificationType = "prayer_approved";
          break;
        case 'rejected':
          notificationTitle = "Prayer Request Not Approved";
          notificationMessage = `Your prayer "${prayerTitle}" was not approved for sharing. You can edit and try again.`;
          notificationType = "prayer_rejected";
          break;
        case 'prayed_for_you':
          notificationTitle = "Someone is Praying for You! 🙏";
          notificationMessage = `${senderName || 'Someone'} is praying for your request: "${prayerTitle}"`;
          notificationType = "prayed_for_you";
          break;
      }

      try {
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: recipientId,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: link,
            metadata: {
              prayer_id: prayerId,
              sender_name: senderName
            }
          });
        console.log("In-app notification created");
      } catch (notifError) {
        console.error("Error creating in-app notification:", notifError);
      }
    }

    // Send email if enabled
    if (emailEnabled) {
      // Get app settings for branding
      const { data: settings } = await supabaseAdmin
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "logo_url")
        .single();

      const logoUrl = settings?.setting_value || "";
      const actionUrl = `${SITE_URL}/prayer-requests`;
      const guardianUrl = `${SITE_URL}/guardian-approvals`;

      let subject = "";
      let emailHtml = "";

      switch (type) {
        case 'pending_approval':
          subject = `Prayer Request Needs Your Approval - ${senderName || 'A Bestie'}`;
          emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
                  .content { padding: 30px 0; }
                  .button { display: inline-block; padding: 12px 24px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; }
                  .preview { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #FF6B35; margin: 20px 0; border-radius: 4px; }
                  .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="Logo" style="max-width: 200px;" /></div>` : ''}
                  <div class="content">
                    <h1>🙏 Prayer Request Needs Approval</h1>
                    <p>Hi ${recipient.display_name || 'Guardian'}!</p>
                    <p><strong>${senderName || 'A bestie'}</strong> has submitted a prayer request that needs your approval before being shared with the community.</p>
                    ${prayerTitle ? `<div class="preview"><strong>Title:</strong> ${prayerTitle}${prayerPreview ? `<br/><br/>${prayerPreview}` : ''}</div>` : ''}
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${guardianUrl}" class="button">Review Prayer Request</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>You can manage your notification preferences in your profile settings.</p>
                  </div>
                </div>
              </body>
            </html>
          `;
          break;

        case 'approved':
          subject = "Your Prayer Request Has Been Approved! 🙏";
          emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
                  .content { padding: 30px 0; }
                  .button { display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; }
                  .success { background-color: #dcfce7; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 4px; }
                  .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="Logo" style="max-width: 200px;" /></div>` : ''}
                  <div class="content">
                    <h1>✅ Prayer Request Approved!</h1>
                    <p>Great news! Your prayer request has been approved and is now shared with the community.</p>
                    <div class="success">
                      <strong>"${prayerTitle || 'Your prayer'}"</strong>
                      <p style="margin: 10px 0 0;">Others can now see and pray for this request in the Community Board.</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${actionUrl}" class="button">View Your Prayers</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>You can manage your notification preferences in your profile settings.</p>
                  </div>
                </div>
              </body>
            </html>
          `;
          break;

        case 'rejected':
          subject = "Prayer Request Update";
          emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
                  .content { padding: 30px 0; }
                  .button { display: inline-block; padding: 12px 24px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; }
                  .notice { background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 4px; }
                  .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="Logo" style="max-width: 200px;" /></div>` : ''}
                  <div class="content">
                    <h1>Prayer Request Update</h1>
                    <p>Your guardian has reviewed your prayer request and it was not approved for public sharing at this time.</p>
                    <div class="notice">
                      <strong>"${prayerTitle || 'Your prayer'}"</strong>
                      <p style="margin: 10px 0 0;">You can edit your prayer and try submitting again, or keep it as a private prayer.</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${actionUrl}" class="button">Edit Prayer Request</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>You can manage your notification preferences in your profile settings.</p>
                  </div>
                </div>
              </body>
            </html>
          `;
          break;

        case 'prayed_for_you':
          subject = "Someone is Praying for You! 🙏";
          emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
                  .content { padding: 30px 0; }
                  .button { display: inline-block; padding: 12px 24px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; }
                  .prayer { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
                  .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="Logo" style="max-width: 200px;" /></div>` : ''}
                  <div class="content">
                    <h1>🙏 Someone is Praying for You!</h1>
                    <p><strong>${senderName || 'A community member'}</strong> is lifting up your prayer request:</p>
                    <div class="prayer">
                      <strong>"${prayerTitle || 'Your prayer request'}"</strong>
                    </div>
                    <p>You are not alone! The community is here supporting you in prayer.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${actionUrl}" class="button">View Community Board</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>You can manage your notification preferences in your profile settings.</p>
                  </div>
                </div>
              </body>
            </html>
          `;
          break;
      }

      // Send the email
      const emailResponse = await resend.emails.send({
        from: SENDERS.prayer,
        to: [recipient.email],
        subject: subject,
        html: emailHtml,
      });

      console.log("Email sent successfully:", emailResponse);

      // Log the notification
      try {
        await supabaseAdmin
          .from("email_notifications_log")
          .insert({
            user_id: recipientId,
            recipient_email: recipient.email,
            notification_type: `prayer_${type}`,
            subject: subject,
            status: "sent",
            metadata: {
              prayer_id: prayerId,
              sender_name: senderName
            }
          });
      } catch (logError) {
        console.error("Error logging email notification:", logError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailEnabled, inappEnabled }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-prayer-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
