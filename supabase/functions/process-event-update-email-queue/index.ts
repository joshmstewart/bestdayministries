import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SITE_URL, SENDERS } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueueItem {
  id: string;
  user_id: string;
  user_email: string;
  event_id: string;
  event_title: string;
  change_description: string;
  event_date: string | null;
  event_location: string | null;
}

// Helper to add delay between API calls (respect Resend's 2 req/sec limit)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch unprocessed queue items
    const { data: queueItems, error: queueError } = await supabaseAdmin
      .from("event_update_email_queue")
      .select("*")
      .eq("processed", false)
      .limit(50);

    if (queueError) {
      console.error("Error fetching queue:", queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get app settings for branding
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["logo_url", "mobile_app_name"]);

    const logoUrl = settings?.find(s => s.setting_key === "logo_url")?.setting_value || "";
    const appName = settings?.find(s => s.setting_key === "mobile_app_name")?.setting_value || "Best Day Ministries";

    let processed = 0;
    const errors: string[] = [];

    for (const item of queueItems as QueueItem[]) {
      try {
        // Rate limiting: wait 600ms between sends (Resend allows 2 req/sec)
        await delay(600);
        const formattedDate = item.event_date 
          ? new Date(item.event_date).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'America/Denver' // Mountain Time
            })
          : 'TBD';

        const subject = `📅 Event Updated: ${item.event_title}`;
        const actionUrl = `${SITE_URL}/community`;

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
                .event-card { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B35; }
                .update-notice { background-color: #fff3cd; padding: 12px 16px; border-radius: 6px; margin: 15px 0; border: 1px solid #ffc107; }
                .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="${appName}" class="logo" /></div>` : `<div class="header"><h2>${appName}</h2></div>`}
                
                <div class="content">
                  <h1>📅 Event Update</h1>
                  
                  <p>An event you're attending has been updated!</p>
                  
                  <div class="update-notice">
                    <strong>⚠️ What changed:</strong> ${item.change_description}
                  </div>
                  
                  <div class="event-card">
                    <h2 style="margin-top: 0;">${item.event_title}</h2>
                    <p><strong>📅 When:</strong> ${formattedDate}</p>
                    ${item.event_location ? `<p><strong>📍 Where:</strong> ${item.event_location}</p>` : ''}
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${actionUrl}" class="button">View Event Details</a>
                  </div>
                  
                  <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    You're receiving this because you RSVP'd to this event. 
                    Manage your notification preferences in your account settings.
                  </p>
                </div>
                
                <div class="footer">
                  <p>This is an automated notification from ${appName}.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        if (resendApiKey) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: SENDERS.community,
              to: [item.user_email],
              subject: subject,
              html: html,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`Resend API error: ${errorText}`);
          }

          // Log the email
          await supabaseAdmin.from("email_notifications_log").insert({
            user_id: item.user_id,
            recipient_email: item.user_email,
            notification_type: "event_update",
            subject: subject,
            status: "sent",
            metadata: {
              event_id: item.event_id,
              event_title: item.event_title,
              change_description: item.change_description,
            },
          });
        }

        // Mark as processed
        await supabaseAdmin
          .from("event_update_email_queue")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("id", item.id);

        processed++;
      } catch (itemError: any) {
        console.error(`Error processing item ${item.id}:`, itemError);
        errors.push(`${item.id}: ${itemError.message}`);
        
        // Update with error
        await supabaseAdmin
          .from("event_update_email_queue")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("id", item.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-event-update-email-queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
