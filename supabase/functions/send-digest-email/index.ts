import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { frequency } = await req.json();
    
    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      throw new Error("Invalid frequency. Must be 'daily' or 'weekly'");
    }

    console.log(`Processing ${frequency} digest emails...`);

    // Get users who need digest emails
    const { data: usersNeedingDigest, error: usersError } = await supabase
      .rpc('get_users_needing_digest', { _frequency: frequency });

    if (usersError) {
      console.error("Error fetching users needing digest:", usersError);
      throw usersError;
    }

    if (!usersNeedingDigest || usersNeedingDigest.length === 0) {
      console.log(`No users need ${frequency} digest at this time`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No ${frequency} digests to send`,
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${usersNeedingDigest.length} users needing ${frequency} digest`);

    let successCount = 0;
    let failCount = 0;

    // Process each user
    for (const user of usersNeedingDigest) {
      try {
        // Fetch their unread notifications
        const { data: notifications, error: notifError } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.user_id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(50); // Limit to most recent 50 notifications

        if (notifError || !notifications || notifications.length === 0) {
          console.log(`No notifications found for user ${user.user_id}`);
          continue;
        }

        // Check if user has digest emails enabled
        const { data: userPrefs } = await supabase
          .from("notification_preferences")
          .select("enable_digest_emails")
          .eq("user_id", user.user_id)
          .single();

        if (userPrefs?.enable_digest_emails === false) {
          console.log(`Skipping digest for ${user.user_email} - digest emails disabled in preferences`);
          continue;
        }

        // Get app logo for email
        const { data: appSettings } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "logo_url")
          .maybeSingle();

        const logoUrl = appSettings?.setting_value || "";

        // Build HTML email
        const emailHtml = buildDigestEmail(notifications, frequency, logoUrl);

        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Notifications <notifications@bestdayministries.org>",
          to: [user.user_email],
          subject: `Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Digest - ${notifications.length} unread notifications`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${user.user_email}:`, emailError);
          
          // Log failed send (graceful handling - don't fail if logging fails)
          try {
            await supabase.from("digest_emails_log").insert({
              user_id: user.user_id,
              recipient_email: user.user_email,
              frequency,
              notification_count: notifications.length,
              status: "failed",
              error_message: emailError.message || "Unknown error",
            });
          } catch (logError) {
            console.error(`Error logging digest failure for ${user.user_email}:`, logError);
          }
          
          failCount++;
          continue;
        }

        console.log(`Successfully sent ${frequency} digest to ${user.user_email}`);

        // Update last digest sent timestamp
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: new Date().toISOString() })
          .eq("user_id", user.user_id);

        // Log successful send (graceful handling - don't fail if logging fails)
        try {
          await supabase.from("digest_emails_log").insert({
            user_id: user.user_id,
            recipient_email: user.user_email,
            frequency,
            notification_count: notifications.length,
            status: "sent",
            metadata: { email_id: emailData?.id },
          });
        } catch (logError) {
          console.error(`Error logging digest success for ${user.user_email}:`, logError);
        }

        successCount++;
      } catch (userError: any) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${frequency} digests`,
        processed: successCount + failCount,
        successful: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-digest-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

function buildDigestEmail(
  notifications: Notification[],
  frequency: string,
  logoUrl: string
): string {
  const groupedNotifications: Record<string, Notification[]> = {};
  
  // Group notifications by type
  notifications.forEach((notif) => {
    if (!groupedNotifications[notif.type]) {
      groupedNotifications[notif.type] = [];
    }
    groupedNotifications[notif.type].push(notif);
  });

  const notificationTypeLabels: Record<string, string> = {
    pending_approval: "Pending Approvals",
    approval_decision: "Approval Decisions",
    new_sponsor_message: "Sponsor Messages",
    message_approved: "Message Approvals",
    message_rejected: "Message Rejections",
    new_sponsorship: "New Sponsorships",
    sponsorship_update: "Sponsorship Updates",
    new_event: "New Events",
    event_update: "Event Updates",
    comment_on_post: "Comments on Your Posts",
    comment_on_thread: "Comments on Discussions",
  };

  let notificationSections = "";

  Object.entries(groupedNotifications).forEach(([type, notifs]) => {
    const typeLabel = notificationTypeLabels[type] || type;
    notificationSections += `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; font-size: 16px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          ${typeLabel} (${notifs.length})
        </h3>
        ${notifs.map((notif) => `
          <div style="background: #f9fafb; border-left: 3px solid #3b82f6; padding: 12px 16px; margin-bottom: 12px; border-radius: 4px;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${notif.title}</div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${notif.message}</div>
            <div style="font-size: 12px; color: #9ca3af;">
              ${new Date(notif.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Digest</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 60px; margin-bottom: 20px; border-radius: 12px;">` : ''}
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Digest
            </h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
              You have ${notifications.length} unread notification${notifications.length === 1 ? '' : 's'}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 0;">
              Here's a summary of your notifications from the past ${frequency === 'daily' ? 'day' : 'week'}:
            </p>

            ${notificationSections}

            <!-- View All Button -->
            <div style="text-align: center; margin-top: 40px;">
              <a href="${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View All Notifications
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0 0 10px 0;">
              You're receiving this ${frequency} digest because you enabled it in your notification preferences.
            </p>
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
              To change your digest preferences, visit your Settings page.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(handler);
