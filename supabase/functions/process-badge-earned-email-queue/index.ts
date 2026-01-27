import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailDelay, RESEND_RATE_LIMIT_MS } from "../_shared/emailRateLimiter.ts";
import { SITE_URL, SENDERS } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unprocessed emails from queue
    const { data: queueItems, error: fetchError } = await supabase
      .from("badge_earned_email_queue")
      .select("*")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No emails to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${queueItems.length} badge earned email(s)`);

    let processed = 0;
    let errors = 0;

    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      
      // Rate limiting: wait between sends (Resend allows 2 req/sec)
      if (i > 0) {
        await emailDelay(RESEND_RATE_LIMIT_MS);
      }
      
      try {
        const baseUrl = SITE_URL;
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #c2410c; margin: 0;">Best Day Ministries</h1>
            </div>
            
            <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">${item.badge_icon || '🏆'}</div>
              
              <h2 style="color: #c2410c; margin: 0 0 20px 0;">
                🎉 Congratulations, ${item.recipient_name || 'Friend'}!
              </h2>
              
              <p style="font-size: 18px; margin: 0 0 15px 0;">
                You earned the <strong>"${item.badge_name}"</strong> badge!
              </p>
              
              ${item.badge_description ? `
                <p style="font-size: 14px; color: #666; margin: 0 0 20px 0;">
                  ${item.badge_description}
                </p>
              ` : ''}
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                Keep up the amazing work! Your dedication is inspiring! 💪
              </p>
              
              <div style="text-align: center;">
                <a href="${baseUrl}/games/daily-challenge" style="display: inline-block; background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">
                  View Your Badges
                </a>
              </div>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
              <p>You're receiving this because you have email notifications enabled for badge achievements.</p>
              <p>Manage your preferences in your <a href="${baseUrl}/profile" style="color: #c2410c;">profile settings</a>.</p>
            </div>
          </body>
          </html>
        `;

        if (RESEND_API_KEY) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: SENDERS.noreply,
              to: [item.recipient_email],
              subject: `🏆 You earned the "${item.badge_name}" badge!`,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`Resend API error: ${errorText}`);
          }
        }

        // Mark as processed
        await supabase
          .from("badge_earned_email_queue")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", item.id);

        processed++;
        console.log(`Sent badge earned email to ${item.recipient_email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${item.recipient_email}:`, emailError);
        
        // Log the error but don't stop processing
        await supabase
          .from("badge_earned_email_queue")
          .update({ 
            processed_at: new Date().toISOString(),
            error_message: emailError instanceof Error ? emailError.message : String(emailError)
          })
          .eq("id", item.id);
        
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processed} emails, ${errors} errors`,
        processed,
        errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing badge earned email queue:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
