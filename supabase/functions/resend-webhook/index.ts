import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    console.log("Received Resend webhook:", payload);

    const { type, data } = payload;

    // Extract campaign and subscriber info from headers
    const campaignId = data.headers?.["X-Campaign-ID"];
    const subscriberId = data.headers?.["X-Subscriber-ID"];
    const email = data.to?.[0] || data.email;

    if (!email) {
      throw new Error("No email in webhook payload");
    }

    // Find subscriber by email if not in headers
    let finalSubscriberId = subscriberId;
    if (!subscriberId) {
      const { data: subscriber } = await supabaseClient
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", email)
        .single();
      
      finalSubscriberId = subscriber?.id;
    }

    // Map Resend event types to our event types
    const eventTypeMap: Record<string, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };

    const eventType = eventTypeMap[type];
    if (!eventType) {
      console.log("Unhandled event type:", type);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare analytics data
    const analyticsData: any = {
      campaign_id: campaignId,
      subscriber_id: finalSubscriberId,
      email: email,
      event_type: eventType,
      resend_event_id: data.email_id || crypto.randomUUID(),
      user_agent: data.user_agent,
      ip_address: data.ip_address,
      metadata: data,
    };

    // For click events, extract URL
    if (eventType === "clicked" && data.link) {
      analyticsData.clicked_url = data.link.url;
      
      // Update link click count if it's a tracked link
      const urlMatch = data.link.url.match(/code=([^&]+)/);
      if (urlMatch) {
        const shortCode = urlMatch[1];
        const { data: link } = await supabaseClient
          .from("newsletter_links")
          .select("click_count")
          .eq("short_code", shortCode)
          .single();
        
        if (link) {
          await supabaseClient
            .from("newsletter_links")
            .update({ click_count: (link.click_count || 0) + 1 })
            .eq("short_code", shortCode);
        }
      }
    }

    // Insert analytics event
    const { error: insertError } = await supabaseClient
      .from("newsletter_analytics")
      .insert(analyticsData);

    if (insertError) {
      console.error("Error inserting analytics:", insertError);
    }

    // Update subscriber status for bounces and complaints
    if (eventType === "bounced" || eventType === "complained") {
      await supabaseClient
        .from("newsletter_subscribers")
        .update({ 
          status: eventType,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq("email", email);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in resend-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});