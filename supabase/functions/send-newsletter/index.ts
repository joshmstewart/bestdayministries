import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNewsletterRequest {
  campaignId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: adminCheck } = await supabaseClient
      .rpc("has_admin_access", { _user_id: user.id });

    if (!adminCheck) {
      throw new Error("Admin access required");
    }

    const { campaignId }: SendNewsletterRequest = await req.json();

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error("Campaign already sent or sending");
    }

    // Update campaign status to sending
    await supabaseClient
      .from("newsletter_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Fetch active subscribers (with optional segment filtering)
    let subscribersQuery = supabaseClient
      .from("newsletter_subscribers")
      .select("*")
      .eq("status", "active");

    // Apply segment filtering if exists
    if (campaign.segment_filter) {
      const filter = campaign.segment_filter as any;
      if (filter.location_state) {
        subscribersQuery = subscribersQuery.eq("location_state", filter.location_state);
      }
      if (filter.location_country) {
        subscribersQuery = subscribersQuery.eq("location_country", filter.location_country);
      }
      if (filter.timezone) {
        subscribersQuery = subscribersQuery.eq("timezone", filter.timezone);
      }
    }

    const { data: subscribers, error: subscribersError } = await subscribersQuery;

    if (subscribersError || !subscribers || subscribers.length === 0) {
      await supabaseClient
        .from("newsletter_campaigns")
        .update({ status: "failed" })
        .eq("id", campaignId);
      throw new Error("No subscribers found");
    }

    // Replace links with tracked versions
    let htmlContent = campaign.html_content;
    const linkRegex = /href="(https?:\/\/[^"]+)"/g;
    const links: { original: string; shortCode: string }[] = [];
    let match;

    while ((match = linkRegex.exec(campaign.html_content)) !== null) {
      const originalUrl = match[1];
      const shortCode = crypto.randomUUID().split("-")[0];
      
      // Store link in database
      await supabaseClient.from("newsletter_links").insert({
        campaign_id: campaignId,
        original_url: originalUrl,
        short_code: shortCode,
      });

      links.push({ original: originalUrl, shortCode });
      
      // Replace in HTML
      const trackingUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track-newsletter-click?code=${shortCode}`;
      htmlContent = htmlContent.replace(
        `href="${originalUrl}"`,
        `href="${trackingUrl}"`
      );
    }

    // Add unsubscribe link
    htmlContent += `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>You're receiving this because you subscribed to our newsletter.</p>
        <p><a href="${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe-newsletter?id={{subscriber_id}}" style="color: #666;">Unsubscribe</a></p>
        <p>Best Day Ministries<br/>Your Address Here</p>
      </div>
    `;

    // Send via Resend in batches
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const batchSize = 100;
    let sentCount = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (subscriber) => {
        const personalizedHtml = htmlContent.replace(/{{subscriber_id}}/g, subscriber.id);
        
        try {
          const { error } = await resend.emails.send({
            from: "Best Day Ministries <newsletter@bestdayministries.org>",
            to: subscriber.email,
            subject: campaign.subject,
            html: personalizedHtml,
            headers: {
              "X-Campaign-ID": campaignId,
              "X-Subscriber-ID": subscriber.id,
            },
          });

          if (error) {
            console.error(`Failed to send to ${subscriber.email}:`, error);
            return false;
          }

          // Log send event
          await supabaseClient.from("newsletter_analytics").insert({
            campaign_id: campaignId,
            subscriber_id: subscriber.id,
            email: subscriber.email,
            event_type: "sent",
          });

          return true;
        } catch (error) {
          console.error(`Error sending to ${subscriber.email}:`, error);
          return false;
        }
      });

      const results = await Promise.all(emailPromises);
      sentCount += results.filter(Boolean).length;

      // Small delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await supabaseClient
      .from("newsletter_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to_count: sentCount,
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount,
        totalSubscribers: subscribers.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});