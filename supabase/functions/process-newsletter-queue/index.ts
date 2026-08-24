import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailDelay, RESEND_RATE_LIMIT_MS } from "../_shared/emailRateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Process newsletter email queue in batches.
 * Designed to run every minute via cron, processing up to 80 emails per run
 * (at 600ms delay = ~48 seconds, leaving buffer for the 60s timeout).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_EMAILS_PER_RUN = 80; // ~48 seconds at 600ms delay
  const MAX_RUNTIME_MS = 55000; // Stop processing at 55s to ensure clean exit

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // --- Authorization: this endpoint sends real email. Cron secret, service role, or admin/owner only. ---
    const cronSecret = Deno.env.get("NEWSLETTER_QUEUE_CRON_KEY") ?? Deno.env.get("NEWSLETTER_QUEUE_CRON_SECRET");
    let authorized = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;


    if (!authorized) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
      if (token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        authorized = true;
      } else if (token) {
        const { data: userData } = await supabaseClient.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userId) {
          const { data: roles } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          authorized = !!roles?.some((r: { role: string }) => r.role === "admin" || r.role === "owner");
        }
      }
    }

    if (!authorized) {
      console.warn("[process-newsletter-queue] Unauthorized invocation blocked");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Atomically claim a batch. FOR UPDATE SKIP LOCKED inside the RPC guarantees that
    // concurrent invocations never claim the same row (previously caused duplicate sends).
    const { data: pendingEmails, error: fetchError } = await supabaseClient
      .rpc("claim_newsletter_queue_batch", { p_limit: MAX_EMAILS_PER_RUN });

    if (fetchError) {
      console.error("[process-newsletter-queue] Error claiming queue batch:", fetchError);
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log("[process-newsletter-queue] No pending emails in queue");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending emails" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    console.log(`[process-newsletter-queue] Processing ${pendingEmails.length} emails`);

    let sentCount = 0;
    let failedCount = 0;
    const campaignUpdates: Map<string, { sent: number; failed: number }> = new Map();

    for (let i = 0; i < pendingEmails.length; i++) {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`[process-newsletter-queue] Time limit reached after ${i} emails`);
        // Release the rows we claimed but never sent so the next run picks them up immediately.
        const unclaimed = pendingEmails.slice(i).map((q: { id: string }) => q.id);
        if (unclaimed.length > 0) {
          await supabaseClient.rpc("release_newsletter_queue_items", { p_ids: unclaimed });
        }

        break;
      }


      const queueItem = pendingEmails[i];
      const maxAttempts = queueItem.max_attempts || 3;
      
      // Skip if max retries exceeded (attempts already incremented by the claim RPC)
      if (queueItem.attempts > maxAttempts) {

        console.log(`[process-newsletter-queue] Max attempts (${maxAttempts}) exceeded for ${queueItem.recipient_email}`);
        await supabaseClient
          .from("newsletter_email_queue")
          .update({
            status: "permanently_failed",
            error_message: `Max retry attempts (${maxAttempts}) exceeded`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", queueItem.id);

        // Log to newsletter_emails_log
        await supabaseClient.from("newsletter_emails_log").insert({
          campaign_id: queueItem.campaign_id,
          recipient_email: queueItem.recipient_email,
          recipient_user_id: queueItem.recipient_user_id,
          subject: queueItem.subject,
          html_content: queueItem.personalized_html,
          status: "permanently_failed",
          error_message: `Max retry attempts (${maxAttempts}) exceeded`,
          metadata: { subscriber_id: queueItem.subscriber_id, queue_id: queueItem.id },
        });

        failedCount++;
        const stats = campaignUpdates.get(queueItem.campaign_id) || { sent: 0, failed: 0 };
        stats.failed++;
        campaignUpdates.set(queueItem.campaign_id, stats);
        continue;
      }
      
      // Row already claimed and marked 'processing' atomically by claim_newsletter_queue_batch.


      try {
        // Rate limiting: wait between sends
        if (i > 0) {
          await emailDelay(RESEND_RATE_LIMIT_MS);
        }

        const { data: emailData, error } = await resend.emails.send({
          from: `${queueItem.from_name} <${queueItem.from_email}>`,
          to: queueItem.recipient_email,
          subject: queueItem.subject,
          html: queueItem.personalized_html,
          headers: {
            "X-Campaign-ID": queueItem.campaign_id,
            "X-Subscriber-ID": queueItem.subscriber_id || "unknown",
          },
        });

        if (error) {
          console.error(`[process-newsletter-queue] Failed to send to ${queueItem.recipient_email}:`, error);
          
          // Update queue item as failed
          await supabaseClient
            .from("newsletter_email_queue")
            .update({
              status: "failed",
              error_message: error.message || String(error),
              processed_at: new Date().toISOString(),
            })
            .eq("id", queueItem.id);

          // Log to newsletter_emails_log
          await supabaseClient.from("newsletter_emails_log").insert({
            campaign_id: queueItem.campaign_id,
            recipient_email: queueItem.recipient_email,
            recipient_user_id: queueItem.recipient_user_id,
            subject: queueItem.subject,
            html_content: queueItem.personalized_html,
            status: "failed",
            error_message: error.message || String(error),
            metadata: { subscriber_id: queueItem.subscriber_id, queue_id: queueItem.id },
          });

          failedCount++;
          
          // Track per-campaign stats
          const stats = campaignUpdates.get(queueItem.campaign_id) || { sent: 0, failed: 0 };
          stats.failed++;
          campaignUpdates.set(queueItem.campaign_id, stats);
          continue;
        }

        // Update queue item as sent
        await supabaseClient
          .from("newsletter_email_queue")
          .update({
            status: "sent",
            resend_email_id: emailData?.id,
            processed_at: new Date().toISOString(),
          })
          .eq("id", queueItem.id);

        // Log to newsletter_emails_log
        await supabaseClient.from("newsletter_emails_log").insert({
          campaign_id: queueItem.campaign_id,
          recipient_email: queueItem.recipient_email,
          recipient_user_id: queueItem.recipient_user_id,
          subject: queueItem.subject,
          html_content: queueItem.personalized_html,
          status: "sent",
          resend_email_id: emailData?.id,
          metadata: { subscriber_id: queueItem.subscriber_id, queue_id: queueItem.id },
        });

        // Log analytics event
        await supabaseClient.from("newsletter_analytics").insert({
          campaign_id: queueItem.campaign_id,
          subscriber_id: queueItem.subscriber_id,
          email: queueItem.recipient_email,
          event_type: "sent",
        });

        sentCount++;
        
        // Track per-campaign stats
        const stats = campaignUpdates.get(queueItem.campaign_id) || { sent: 0, failed: 0 };
        stats.sent++;
        campaignUpdates.set(queueItem.campaign_id, stats);

      } catch (error: any) {
        console.error(`[process-newsletter-queue] Error processing ${queueItem.recipient_email}:`, error);
        
        await supabaseClient
          .from("newsletter_email_queue")
          .update({
            status: "failed",
            error_message: error.message || String(error),
            processed_at: new Date().toISOString(),
          })
          .eq("id", queueItem.id);

        // Log to newsletter_emails_log
        await supabaseClient.from("newsletter_emails_log").insert({
          campaign_id: queueItem.campaign_id,
          recipient_email: queueItem.recipient_email,
          recipient_user_id: queueItem.recipient_user_id,
          subject: queueItem.subject,
          html_content: queueItem.personalized_html,
          status: "failed",
          error_message: error.message || String(error),
          metadata: { subscriber_id: queueItem.subscriber_id, queue_id: queueItem.id },
        });

        failedCount++;
        
        const stats = campaignUpdates.get(queueItem.campaign_id) || { sent: 0, failed: 0 };
        stats.failed++;
        campaignUpdates.set(queueItem.campaign_id, stats);
      }
    }

    // Update campaign progress counts
    for (const [campaignId, stats] of campaignUpdates) {
      // Increment processed and failed counts
      const { data: campaign } = await supabaseClient
        .from("newsletter_campaigns")
        .select("processed_count, failed_count, queued_count")
        .eq("id", campaignId)
        .single();

      if (campaign) {
        const newProcessedCount = (campaign.processed_count || 0) + stats.sent;
        const newFailedCount = (campaign.failed_count || 0) + stats.failed;
        
        // Check if campaign is complete
        const totalProcessed = newProcessedCount + newFailedCount;
        const isComplete = totalProcessed >= (campaign.queued_count || 0);

        await supabaseClient
          .from("newsletter_campaigns")
          .update({
            processed_count: newProcessedCount,
            failed_count: newFailedCount,
            sent_to_count: newProcessedCount,
            status: isComplete ? "sent" : "sending",
            last_progress_at: new Date().toISOString(),
            ...(isComplete ? { sent_at: new Date().toISOString() } : {}),
          })
          .eq("id", campaignId);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[process-newsletter-queue] Complete: ${sentCount} sent, ${failedCount} failed in ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: sentCount + failedCount,
        sent: sentCount,
        failed: failedCount,
        duration: `${duration}s`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[process-newsletter-queue] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
