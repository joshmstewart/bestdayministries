import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parseUserAgent } from "../_shared/userAgentParser.ts";

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

    // Map Resend event types to our status values
    const eventTypeMap: Record<string, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
      "email.delivery_delayed": "pending",
      "email.failed": "failed",
    };

    const eventType = eventTypeMap[type];
    if (!eventType) {
      console.log("Unhandled event type:", type);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update email_audit_log for ALL emails (receipts, notifications, etc.)
    if (data.email_id) {
      const updateData: any = {
        status: eventType,
      };

      // Add delivery timestamp for delivered status
      if (eventType === "delivered") {
        updateData.sent_at = new Date().toISOString();
      }

      // Add error message for bounces and failures
      if (eventType === "bounced" || eventType === "failed") {
        updateData.error_message = data.error || data.bounce_type || "Email delivery failed";
      }

      // Update the email_audit_log record
      const { error: auditError } = await supabaseClient
        .from("email_audit_log")
        .update(updateData)
        .eq("resend_email_id", data.email_id);

      if (auditError) {
        console.error("Error updating email_audit_log:", auditError);
      } else {
        console.log("Updated email_audit_log:", { email_id: data.email_id, status: eventType });
      }
    }

    // Skip newsletter analytics for non-newsletter emails
    if (!campaignId) {
      console.log("Email audit log updated, skipping newsletter analytics");
      return new Response(
        JSON.stringify({ received: true, audit_updated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Newsletter-specific analytics processing

    // Parse user agent to extract email client info
    const parsedUA = parseUserAgent(data.user_agent);

    // Prepare analytics data with email client parsing
    const analyticsData: any = {
      campaign_id: campaignId,
      subscriber_id: finalSubscriberId,
      email: email,
      event_type: eventType,
      resend_event_id: data.email_id || crypto.randomUUID(),
      user_agent: data.user_agent,
      ip_address: data.ip_address,
      metadata: data,
      // New email client tracking fields
      email_client: parsedUA.emailClient,
      email_client_version: parsedUA.emailClientVersion,
      device_type: parsedUA.deviceType,
      os_name: parsedUA.osName,
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

    // Update automated campaign sends status and engagement tracking
    if (eventType === "delivered" || eventType === "bounced" || eventType === "failed" || 
        eventType === "opened" || eventType === "clicked" || eventType === "complained") {
      
      const updateData: any = {};
      const now = new Date().toISOString();
      
      // Set status for terminal states
      if (eventType === "delivered") {
        updateData.status = "delivered";
      } else if (eventType === "bounced") {
        updateData.status = "bounced";
        updateData.error_message = "Email bounced";
      } else if (eventType === "failed") {
        updateData.status = "failed";
      } else if (eventType === "complained") {
        updateData.status = "complained";
        updateData.complained_at = now;
      }
      
      // Track engagement events (don't change status, just add timestamps)
      if (eventType === "opened") {
        updateData.opened_at = now;
      } else if (eventType === "clicked") {
        updateData.clicked_at = now;
      }

      await supabaseClient
        .from("automated_campaign_sends")
        .update(updateData)
        .eq("recipient_email", email)
        .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days only
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