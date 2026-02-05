 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 interface ResendEmailResponse {
   id: string;
   from: string;
   to: string[];
   subject: string;
   created_at: string;
   last_event: string;
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
     if (!RESEND_API_KEY) {
       throw new Error("RESEND_API_KEY not configured");
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const { campaignId, mode } = await req.json();
 
     console.log(`[sync-newsletter-analytics] Starting sync - mode: ${mode}, campaignId: ${campaignId}`);
 
     // Determine which campaigns to sync
     let campaignIds: string[] = [];
 
     if (mode === "recent") {
       // Sync campaigns from last 7 days that have been sent
       const sevenDaysAgo = new Date();
       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
 
       const { data: recentCampaigns, error: campaignsError } = await supabase
         .from("newsletter_campaigns")
         .select("id")
         .eq("status", "sent")
         .gte("sent_at", sevenDaysAgo.toISOString());
 
       if (campaignsError) throw campaignsError;
       campaignIds = (recentCampaigns || []).map((c) => c.id);
       console.log(`[sync-newsletter-analytics] Found ${campaignIds.length} recent campaigns to sync`);
     } else if (campaignId) {
       campaignIds = [campaignId];
     } else {
       throw new Error("Must provide either campaignId or mode='recent'");
     }
 
     if (campaignIds.length === 0) {
       return new Response(
         JSON.stringify({ success: true, message: "No campaigns to sync", synced: 0 }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     let totalSynced = 0;
     let totalUpdated = 0;
     const results: { campaignId: string; synced: number; updated: number }[] = [];
 
     for (const cId of campaignIds) {
       // Get all emails for this campaign that need syncing
       // Only sync emails that aren't at a terminal state
       const { data: emails, error: emailsError } = await supabase
         .from("newsletter_emails_log")
         .select("id, resend_email_id, status, recipient_email")
         .eq("campaign_id", cId)
         .not("resend_email_id", "is", null)
         .in("status", ["sent", "pending", "queued"]); // Only non-terminal states
 
       if (emailsError) {
         console.error(`[sync-newsletter-analytics] Error fetching emails for campaign ${cId}:`, emailsError);
         continue;
       }
 
       console.log(`[sync-newsletter-analytics] Campaign ${cId}: ${emails?.length || 0} emails to check`);
 
       if (!emails || emails.length === 0) {
         // Update synced_at even if nothing to sync
         await supabase
           .from("newsletter_campaigns")
           .update({ analytics_synced_at: new Date().toISOString() })
           .eq("id", cId);
         continue;
       }
 
       let campaignSynced = 0;
       let campaignUpdated = 0;
 
       // Process emails in batches with rate limiting
       for (const email of emails) {
         if (!email.resend_email_id) continue;
 
         try {
           // Fetch email status from Resend API
           const response = await fetch(`https://api.resend.com/emails/${email.resend_email_id}`, {
             headers: {
               Authorization: `Bearer ${RESEND_API_KEY}`,
             },
           });
 
           if (!response.ok) {
             console.error(`[sync-newsletter-analytics] Resend API error for ${email.resend_email_id}: ${response.status}`);
             continue;
           }
 
           const resendData: ResendEmailResponse = await response.json();
           const newStatus = resendData.last_event || "sent";
 
           campaignSynced++;
 
           // Only update if status changed
           if (newStatus !== email.status) {
             // Update newsletter_emails_log status
             await supabase
               .from("newsletter_emails_log")
               .update({ status: newStatus })
               .eq("id", email.id);
 
             // Insert analytics event if not already exists
             const eventType = newStatus; // delivered, opened, bounced, complained, etc.
 
             // Check if this event already exists
             const { data: existingEvent } = await supabase
               .from("newsletter_analytics")
               .select("id")
               .eq("campaign_id", cId)
               .eq("subscriber_id", email.id)
               .eq("event_type", eventType)
               .maybeSingle();
 
             if (!existingEvent) {
               await supabase.from("newsletter_analytics").insert({
                 campaign_id: cId,
                 subscriber_id: email.id,
                 event_type: eventType,
                 recipient_email: email.recipient_email,
               });
             }
 
             campaignUpdated++;
             console.log(`[sync-newsletter-analytics] Updated ${email.recipient_email}: ${email.status} -> ${newStatus}`);
           }
 
           // Rate limiting: 600ms delay between API calls
           await new Promise((resolve) => setTimeout(resolve, 600));
         } catch (err) {
           console.error(`[sync-newsletter-analytics] Error processing email ${email.resend_email_id}:`, err);
         }
       }
 
       // Update campaign's analytics_synced_at timestamp
       await supabase
         .from("newsletter_campaigns")
         .update({ analytics_synced_at: new Date().toISOString() })
         .eq("id", cId);
 
       totalSynced += campaignSynced;
       totalUpdated += campaignUpdated;
       results.push({ campaignId: cId, synced: campaignSynced, updated: campaignUpdated });
 
       console.log(`[sync-newsletter-analytics] Campaign ${cId} complete: ${campaignSynced} synced, ${campaignUpdated} updated`);
     }
 
     console.log(`[sync-newsletter-analytics] All done: ${totalSynced} emails synced, ${totalUpdated} updated`);
 
     return new Response(
       JSON.stringify({
         success: true,
         totalSynced,
         totalUpdated,
         campaigns: results,
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