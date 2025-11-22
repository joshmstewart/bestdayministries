import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = new Date().toISOString();
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
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY")
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

    for (const sponsorship of sponsorships || []) {
      try {
        results.checked++;
        
        // Skip if wrong Stripe mode
        if (sponsorship.stripe_mode !== stripeMode) {
          continue;
        }

        // Fetch subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
        
        let newStatus = sponsorship.status;
        let endDate = null;
        const beforeState = {
          status: sponsorship.status,
          ended_at: sponsorship.ended_at,
        };

        if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
          newStatus = "cancelled";
          endDate = new Date(subscription.canceled_at! * 1000).toISOString();
          results.cancelled++;
        } else if (subscription.status === "paused") {
          newStatus = "paused";
        } else if (subscription.status === "active") {
          newStatus = "active";
        }

        // Update if status changed
        if (newStatus !== sponsorship.status) {
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update({ 
              status: newStatus, 
              ended_at: endDate 
            })
            .eq("id", sponsorship.id);

          if (updateError) {
            results.errors.push(`Failed to update ${sponsorship.id}: ${updateError.message}`);
          } else {
            results.updated++;
            console.log(`Updated sponsorship ${sponsorship.id} to ${newStatus}`);
            
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
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.errors.push(`Error syncing ${sponsorship.id}: ${message}`);
      }
    }

    // Log the job execution
    try {
      const { data: jobLog, error: logError } = await supabaseAdmin
        .from('reconciliation_job_logs')
        .insert({
          job_name: 'sync-sponsorships',
          ran_at: startTime,
          completed_at: new Date().toISOString(),
          stripe_mode: stripeMode,
          triggered_by: user?.id || 'system',
          checked_count: results.checked,
          updated_count: results.updated,
          skipped_count: 0,
          error_count: results.errors.length,
          errors: results.errors,
          status: results.errors.length > 0 ? 'partial_failure' : 'success',
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
