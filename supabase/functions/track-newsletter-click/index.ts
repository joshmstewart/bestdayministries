import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parseUserAgent } from "../_shared/userAgentParser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const shortCode = url.searchParams.get("code");
    const subscriberId = url.searchParams.get("sid");

    if (!shortCode) {
      return new Response("Missing code parameter", { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up original URL
    const { data: link, error: linkError } = await supabaseClient
      .from("newsletter_links")
      .select("*, newsletter_campaigns(id)")
      .eq("short_code", shortCode)
      .single();

    if (linkError || !link) {
      return new Response("Link not found", { status: 404 });
    }

    // Look up subscriber email if we have subscriber_id
    let subscriberEmail = "unknown";
    let validSubscriberId: string | null = null;
    
    if (subscriberId && subscriberId !== "unknown" && subscriberId !== "{{subscriber_id}}") {
      const { data: subscriber } = await supabaseClient
        .from("newsletter_subscribers")
        .select("id, email")
        .eq("id", subscriberId)
        .single();
      
      if (subscriber) {
        subscriberEmail = subscriber.email;
        validSubscriberId = subscriber.id;
      }
    }

    // Capture timezone from request (would need to be sent from client)
    const timezone = req.headers.get("X-Timezone") || "Unknown";
    const userAgent = req.headers.get("User-Agent") || "";
    const ipAddress = req.headers.get("X-Forwarded-For")?.split(",")[0] || 
                      req.headers.get("X-Real-IP") || "";

    // Parse user agent for email client info
    const parsedUA = parseUserAgent(userAgent);

    // Log click event with subscriber info and email client info
    await supabaseClient.from("newsletter_analytics").insert({
      campaign_id: link.campaign_id,
      subscriber_id: validSubscriberId,
      email: subscriberEmail,
      event_type: "clicked",
      clicked_url: link.original_url,
      user_agent: userAgent,
      ip_address: ipAddress,
      timezone: timezone,
      // Email client tracking
      email_client: parsedUA.emailClient,
      email_client_version: parsedUA.emailClientVersion,
      device_type: parsedUA.deviceType,
      os_name: parsedUA.osName,
    });

    // Increment click count
    await supabaseClient
      .from("newsletter_links")
      .update({ click_count: (link.click_count || 0) + 1 })
      .eq("id", link.id);

    // Redirect to original URL
    return Response.redirect(link.original_url, 302);
  } catch (error: any) {
    console.error("Error in track-newsletter-click:", error);
    return new Response("Internal server error", { status: 500 });
  }
});