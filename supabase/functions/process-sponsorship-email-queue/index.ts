import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueueItem {
  id: string;
  user_id: string;
  user_email: string;
  notification_type: 'new_sponsorship' | 'sponsorship_update';
  bestie_name: string | null;
  sponsor_name: string | null;
  amount: number;
  tier_name: string | null;
  old_amount: number | null;
  old_tier_name: string | null;
}

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
      .from("sponsorship_email_queue")
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
        let subject = "";
        let content = "";
        let actionUrl = "https://bestdayministries.lovable.app/guardian-links";

        if (item.notification_type === 'new_sponsorship') {
          subject = `🎉 ${item.bestie_name ? `New Sponsor for ${item.bestie_name}` : 'You Have a New Sponsor!'}`;
          content = `
            <p>Great news! <strong>${item.sponsor_name || 'A generous supporter'}</strong> has started sponsoring ${item.bestie_name || 'you'}!</p>
            <div class="highlight">
              <strong>Sponsorship Details:</strong><br/>
              ${item.tier_name ? `Tier: ${item.tier_name}<br/>` : ''}
              Amount: $${item.amount?.toFixed(2) || '0.00'}/month
            </div>
            <p>Log in to view more details and send a thank you message.</p>
          `;
        } else if (item.notification_type === 'sponsorship_update') {
          subject = `📝 Sponsorship Update${item.bestie_name ? ` for ${item.bestie_name}` : ''}`;
          
          let changeDetails = '';
          if (item.old_amount && item.old_amount !== item.amount) {
            changeDetails = `Amount changed from $${item.old_amount?.toFixed(2)} to $${item.amount?.toFixed(2)}/month`;
          } else if (item.old_tier_name !== item.tier_name) {
            changeDetails = `Tier changed to ${item.tier_name || 'custom'}`;
          }
          
          content = `
            <p>A sponsorship has been updated.</p>
            <div class="highlight">
              <strong>What changed:</strong><br/>
              ${changeDetails}<br/>
              ${item.sponsor_name ? `Sponsor: ${item.sponsor_name}` : ''}
            </div>
            <p>Log in to view the updated sponsorship details.</p>
          `;
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
                .highlight { background-color: #fff8f5; padding: 15px; border-left: 4px solid #FF6B35; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                ${logoUrl ? `<div class="header"><img src="${logoUrl}" alt="${appName}" class="logo" /></div>` : `<div class="header"><h2>${appName}</h2></div>`}
                
                <div class="content">
                  <h1>${item.notification_type === 'new_sponsorship' ? '🎉' : '📝'} ${subject.replace(/^[🎉📝]\s*/, '')}</h1>
                  
                  ${content}
                  
                  <div style="text-align: center;">
                    <a href="${actionUrl}" class="button">View Details</a>
                  </div>
                  
                  <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    You're receiving this email because you opted in to sponsorship notifications. 
                    Manage your preferences in your account settings.
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
              from: "Community Notifications <notifications@bestdayministries.org>",
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
            notification_type: item.notification_type,
            subject: subject,
            status: "sent",
            metadata: {
              bestie_name: item.bestie_name,
              sponsor_name: item.sponsor_name,
              amount: item.amount,
            },
          });
        }

        // Mark as processed
        await supabaseAdmin
          .from("sponsorship_email_queue")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("id", item.id);

        processed++;
      } catch (itemError: any) {
        console.error(`Error processing item ${item.id}:`, itemError);
        errors.push(`${item.id}: ${itemError.message}`);
        
        // Update with error
        await supabaseAdmin
          .from("sponsorship_email_queue")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("id", item.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-sponsorship-email-queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
