import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SITE_URL, SENDERS } from "../_shared/domainConstants.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const { data: hasAdminAccess } = await supabase.rpc('has_admin_access', { _user_id: user.id });
    if (!hasAdminAccess) {
      throw new Error("Admin access required");
    }

    const { frequency } = await req.json();
    
    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      throw new Error("Invalid frequency. Must be 'daily' or 'weekly'");
    }

    console.log(`Sending test ${frequency} digest email to admin ${user.email}...`);

    // Get user's email from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const userEmail = profile?.email || user.email;

    if (!userEmail) {
      throw new Error("No email found for user");
    }

    // Calculate time frame based on frequency
    const now = new Date();
    let timeFrameStart: Date;
    if (frequency === 'daily') {
      timeFrameStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    } else {
      timeFrameStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    }

    // Fetch ALL notifications within the time frame (not just unread) for realistic test preview
    let { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", timeFrameStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    // If no notifications in time frame, use sample data
    if (!notifications || notifications.length === 0) {
      notifications = [
        {
          id: "sample-1",
          type: "comment_on_post",
          title: "Sample Notification",
          message: `This is a test ${frequency} digest email. You have no notifications from the past ${frequency === 'daily' ? '24 hours' : '7 days'}, so this sample is shown.`,
          link: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "sample-2",
          type: "new_event",
          title: "Sample Event Notification",
          message: "A new event has been scheduled. This is sample content for your test digest.",
          link: null,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ] as Notification[];
    }

    // Get app logo for email
    const { data: appSettings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .maybeSingle();

    // Handle setting_value which is stored as JSON - could be a string or object
    let logoUrl = "";
    if (appSettings?.setting_value) {
      const val = appSettings.setting_value;
      if (typeof val === 'string') {
        // Remove any surrounding quotes if present (JSON string storage)
        logoUrl = val.replace(/^"|"$/g, '');
      } else if (typeof val === 'object' && val !== null) {
        // Handle object format
        logoUrl = (val as any).url || (val as any).value || JSON.stringify(val);
      }
    }
    
    console.log("Logo URL resolved:", logoUrl);

    // Build HTML email
    const emailHtml = buildDigestEmail(notifications as Notification[], frequency, logoUrl);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Notifications <notifications@bestdayministries.org>",
      to: [userEmail],
      subject: `[TEST] Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Digest - ${notifications.length} notifications`,
      html: emailHtml,
    });

    if (emailError) {
      console.error(`Error sending test email:`, emailError);
      throw new Error(emailError.message || "Failed to send email");
    }

    console.log(`Successfully sent test ${frequency} digest to ${userEmail}`);

    // Log the test send
    try {
      await supabase.from("digest_emails_log").insert({
        user_id: user.id,
        recipient_email: userEmail,
        frequency,
        notification_count: notifications.length,
        status: "sent",
        metadata: { email_id: emailData?.id, is_test: true },
      });
    } catch (logError) {
      console.error("Error logging test digest:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test ${frequency} digest sent to ${userEmail}`,
        notificationCount: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-digest-email-test function:", error);
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
    content_like: "Content Likes",
    product_update: "Product Updates",
    vendor_application: "Vendor Applications",
    moderation_needed: "Moderation Needed",
    prayer_request: "Prayer Requests",
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
        <title>[TEST] Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Digest</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Test Banner -->
          <div style="background-color: #fef3c7; padding: 12px 20px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 14px;">
              ⚠️ THIS IS A TEST EMAIL - Sent manually by admin
            </p>
          </div>

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 60px; margin-bottom: 20px; border-radius: 12px;">` : ''}
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Digest
            </h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
              You have ${notifications.length} notification${notifications.length === 1 ? '' : 's'}
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
              <a href="${SITE_URL}/notifications"
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
