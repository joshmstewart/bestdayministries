 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const { campaignId, mode } = await req.json();
 
     console.log(`[sync-newsletter-analytics] Starting sync - mode: ${mode}, campaignId: ${campaignId}`);
 
     // Note: The Resend "Retrieve Email" API endpoint requires a paid plan.
     // Analytics are collected via webhooks instead (resend-webhook function).
     // This function now just summarizes what the webhook has collected.
 
     const targetCampaignId = campaignId || null;
 
     // Get analytics summary from webhook-collected data
     let query = supabase
       .from("newsletter_analytics")
       .select("event_type, campaign_id")
       .order("created_at", { ascending: false });
 
     if (targetCampaignId) {
       query = query.eq("campaign_id", targetCampaignId);
     }
 
     const { data: analytics, error: analyticsError } = await query.limit(1000);
     if (analyticsError) throw analyticsError;
 
     // Count events by type
     const eventCounts: Record<string, number> = {};
     (analytics || []).forEach((a) => {
       eventCounts[a.event_type] = (eventCounts[a.event_type] || 0) + 1;
     });
 
     // Update synced timestamp
     if (targetCampaignId) {
       await supabase
         .from("newsletter_campaigns")
         .update({ analytics_synced_at: new Date().toISOString() })
         .eq("id", targetCampaignId);
     }
 
     console.log(`[sync-newsletter-analytics] Analytics summary:`, eventCounts);
 
     return new Response(
       JSON.stringify({
         success: true,
         message: "Analytics are collected via webhooks. This function summarizes webhook data.",
         eventCounts,
         note: "To see 'delivered' and 'opened' events, ensure Resend webhooks are configured for email.delivered and email.opened events at https://resend.com/webhooks",
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : "Unknown error";
     console.error("[sync-newsletter-analytics] Error:", errorMessage);
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });