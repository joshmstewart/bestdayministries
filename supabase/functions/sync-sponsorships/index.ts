import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = new Date().toISOString();
    console.log(`\n=== Starting Sponsorship Sync ===`);
    console.log(`Sync started at: ${startTime}`);
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => ["admin", "owner"].includes(r.role));
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get Stripe mode
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "stripe_mode")
      .single();

    const stripeMode = settings?.setting_value === "live" ? "live" : "test";
    console.log(`Using Stripe mode: ${stripeMode}`);
    
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    const stripe = new Stripe(stripeKey!, {
      apiVersion: "2025-08-27.basil",
    });

    // Fetch all sponsorships with subscription IDs
    const { data: sponsorships, error: fetchError } = await supabaseAdmin
      .from("sponsorships")
      .select("id, stripe_subscription_id, status, stripe_mode, ended_at")
      .not("stripe_subscription_id", "is", null)
      .in("status", ["active", "paused"]);

    if (fetchError) {
      throw new Error(`Error fetching sponsorships: ${fetchError.message}`);
    }

    console.log(`Found ${sponsorships?.length || 0} sponsorships to sync`);

    const results = {
      checked: 0,
      updated: 0,
      cancelled: 0,
      errors: [] as string[],
    };

    // Track changes for logging
    const changes: Array<{
      sponsorship_id: string;
      change_type: string;
      before_state: any;
      after_state: any;
      stripe_subscription_id: string;
    }> = [];

    // Track detailed logs
    const detailedLogs: Array<{
      timestamp: string;
      sponsorship_id: string;
      level: 'info' | 'success' | 'warning' | 'error';
      message: string;
      details?: any;
    }> = [];

    for (const sponsorship of sponsorships || []) {
      try {
        results.checked++;
        detailedLogs.push({
          timestamp: new Date().toISOString(),
          sponsorship_id: sponsorship.id,
          level: 'info',
          message: `Checking sponsorship ${sponsorship.id}`,
          details: {
            current_status: sponsorship.status,
            stripe_subscription_id: sponsorship.stripe_subscription_id,
            stripe_mode: sponsorship.stripe_mode,
          }
        });
        console.log(`\nChecking sponsorship ${sponsorship.id}...`);
        console.log(`  Current status: ${sponsorship.status}`);
        console.log(`  Stripe subscription: ${sponsorship.stripe_subscription_id}`);
        console.log(`  Stripe mode: ${sponsorship.stripe_mode}`);
        
        // Skip if wrong Stripe mode
        if (sponsorship.stripe_mode !== stripeMode) {
          console.log(`  ⏭️  Skipped (wrong Stripe mode: expected ${stripeMode}, got ${sponsorship.stripe_mode})`);
          continue;
        }

        let newStatus = sponsorship.status;
        let endDate = null;
        const beforeState = {
          status: sponsorship.status,
          ended_at: sponsorship.ended_at,
        };

        // Check if this is a payment intent (one-time) or subscription (recurring)
        const isPaymentIntent = sponsorship.stripe_subscription_id.startsWith('pi_');
        
        if (isPaymentIntent) {
          // Handle payment intent (one-time payment)
          console.log(`  Fetching payment intent from Stripe...`);
          const paymentIntent = await stripe.paymentIntents.retrieve(sponsorship.stripe_subscription_id);
          console.log(`  Stripe payment intent status: ${paymentIntent.status}`);
          
          if (paymentIntent.status === "succeeded") {
            newStatus = "completed";
          } else if (paymentIntent.status === "canceled") {
            newStatus = "cancelled";
            endDate = new Date(paymentIntent.canceled_at || Date.now()).toISOString();
            results.cancelled++;
          } else {
            // Other statuses (processing, requires_action, etc.) - leave as is
            console.log(`  ℹ️  Payment intent in ${paymentIntent.status} state, no action needed`);
          }
        } else {
          // Handle subscription (recurring payment)
          console.log(`  Fetching subscription from Stripe...`);
          const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
          console.log(`  Stripe subscription status: ${subscription.status}`);
          console.log(`  cancel_at_period_end: ${subscription.cancel_at_period_end}`);
          console.log(`  cancel_at: ${subscription.cancel_at}`);
          
          if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
            newStatus = "cancelled";
            endDate = new Date((subscription.canceled_at || Date.now() / 1000) * 1000).toISOString();
            results.cancelled++;
          } else if (subscription.status === "paused") {
            newStatus = "paused";
          } else if (subscription.cancel_at_period_end) {
            // Subscription is active but scheduled to cancel at period end
            newStatus = "scheduled_cancel";
            endDate = subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null;
            console.log(`  ⏳ Scheduled to cancel at: ${endDate}`);
          } else if (subscription.status === "active") {
            newStatus = "active";
            // Clear ended_at if subscription was reactivated
            if (sponsorship.ended_at) {
              endDate = null; // Explicitly set to null to clear
            }
          }
        }

        // Update if status changed or ended_at changed (for scheduled_cancel tracking)
        const needsUpdate = newStatus !== sponsorship.status || 
          (endDate !== null && endDate !== sponsorship.ended_at) ||
          (endDate === null && sponsorship.ended_at !== null);
          
        if (needsUpdate) {
          console.log(`  Status change detected: ${sponsorship.status} → ${newStatus}`);
          if (endDate) {
            console.log(`  Setting ended_at: ${endDate}`);
          }
          
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update({ 
              status: newStatus, 
              ended_at: endDate 
            })
            .eq("id", sponsorship.id);

          if (updateError) {
            console.log(`  ❌ Update failed: ${updateError.message}`);
            results.errors.push(`Failed to update ${sponsorship.id}: ${updateError.message}`);
          } else {
            results.updated++;
            console.log(`  ✅ Successfully updated to ${newStatus}`);
            
            // Track the change
            const afterState = {
              status: newStatus,
              ended_at: endDate,
            };
            changes.push({
              sponsorship_id: sponsorship.id,
              change_type: newStatus === 'cancelled' ? 'cancellation' : 'status_update',
              before_state: beforeState,
              after_state: afterState,
              stripe_subscription_id: sponsorship.stripe_subscription_id,
            });
          }
        } else {
          console.log(`  ℹ️  No status change needed (already ${sponsorship.status})`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ Error syncing sponsorship: ${message}`);
        results.errors.push(`Error syncing ${sponsorship.id}: ${message}`);
      }
    }

    const endTime = new Date().toISOString();

    // Log the job execution
    try {
      const { data: jobLog, error: logError } = await supabaseAdmin
        .from('reconciliation_job_logs')
        .insert({
          job_name: 'sync-sponsorships',
          ran_at: startTime,
          completed_at: endTime,
          stripe_mode: stripeMode,
          triggered_by: user?.id || 'system',
          checked_count: results.checked,
          updated_count: results.updated,
          skipped_count: 0,
          error_count: results.errors.length,
          errors: results.errors,
          status: results.errors.length > 0 ? 'partial_failure' : 'success',
          metadata: {
            detailed_logs: detailedLogs,
            start_time: startTime,
            end_time: endTime,
            cancelled_count: results.cancelled,
          }
        })
        .select()
        .single();

      if (logError) {
        console.error('Failed to create job log:', logError);
      } else if (jobLog && changes.length > 0) {
        // Insert individual changes
        const { error: changesError } = await supabaseAdmin
          .from('reconciliation_changes')
          .insert(
            changes.map(c => ({
              ...c,
              job_log_id: jobLog.id,
            }))
          );

        if (changesError) {
          console.error('Failed to log changes:', changesError);
        } else {
          console.log(`Logged ${changes.length} changes`);
        }
      }
    } catch (logError) {
      console.error('Error logging job:', logError);
      // Don't fail the whole operation if logging fails
    }

    console.log(`\n=== Sync Complete ===`);
    console.log(`Started: ${startTime}`);
    console.log(`Completed: ${endTime}`);
    console.log(`Checked: ${results.checked} sponsorships`);
    console.log(`Updated: ${results.updated} sponsorships`);
    console.log(`Cancelled: ${results.cancelled} sponsorships`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.updated > 0) {
      console.log(`\n✅ Successfully synced ${results.updated} sponsorships with Stripe`);
    }
    if (results.cancelled > 0) {
      console.log(`🚫 Marked ${results.cancelled} sponsorships as cancelled`);
    }
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors occurred during sync:`);
      results.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
