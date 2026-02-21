import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access (skip for cron calls with service role)
    const authHeader = req.headers.get('Authorization');
    const isCronCall = authHeader?.includes(Deno.env.get("SUPABASE_ANON_KEY") ?? "NONE");
    
    if (!isCronCall && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (!user) throw new Error('Unauthorized');
      
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (!roleData || !['admin', 'owner'].includes(roleData.role)) {
        throw new Error('Admin access required');
      }
    }

    // Thresholds
    const RECONCILE_AFTER_MINUTES = 30;
    const AUTO_CANCEL_AFTER_HOURS = 24;
    
    const thirtyMinutesAgo = new Date(Date.now() - RECONCILE_AFTER_MINUTES * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - AUTO_CANCEL_AFTER_HOURS * 60 * 60 * 1000).toISOString();

    // Fetch all pending pledges older than 30 minutes
    const { data: pendingPledges, error: fetchError } = await supabaseAdmin
      .from('bike_ride_pledges')
      .select('*')
      .eq('charge_status', 'pending')
      .lt('created_at', thirtyMinutesAgo);

    if (fetchError) {
      console.error('Error fetching pending pledges:', fetchError);
      throw new Error('Failed to fetch pending pledges');
    }

    if (!pendingPledges || pendingPledges.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending pledges to reconcile',
          summary: { confirmed: 0, failed: 0, auto_cancelled: 0, skipped: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingPledges.length} pending pledges to reconcile`);

    const results: Array<{
      pledge_id: string;
      pledger_email: string;
      action: string;
      stripe_status?: string;
      error?: string;
    }> = [];

    let confirmed = 0;
    let failed = 0;
    let autoCancelled = 0;
    let skipped = 0;

    for (const pledge of pendingPledges) {
      try {
        // If no setup intent ID, can't verify — auto-cancel if old enough
        if (!pledge.stripe_setup_intent_id) {
          if (pledge.created_at < twentyFourHoursAgo) {
            await supabaseAdmin
              .from('bike_ride_pledges')
              .update({ charge_status: 'cancelled', charge_error: 'No setup intent - auto-cancelled after 24h' })
              .eq('id', pledge.id);
            autoCancelled++;
            results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'auto_cancelled', error: 'No setup intent ID' });
          } else {
            skipped++;
            results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'skipped', error: 'No setup intent, too recent to cancel' });
          }
          continue;
        }

        // Determine which Stripe key to use based on pledge's stripe_mode
        const stripeKey = pledge.stripe_mode === 'live'
          ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
          : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!stripeKey) {
          skipped++;
          results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'skipped', error: `No Stripe ${pledge.stripe_mode} key configured` });
          continue;
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

        // Retrieve the SetupIntent from Stripe
        const setupIntent = await stripe.setupIntents.retrieve(pledge.stripe_setup_intent_id);
        console.log(`Pledge ${pledge.id}: Stripe SetupIntent status = ${setupIntent.status}`);

        if (setupIntent.status === 'succeeded') {
          // Card was verified successfully — confirm the pledge
          const { error: updateError } = await supabaseAdmin
            .from('bike_ride_pledges')
            .update({ charge_status: 'confirmed' })
            .eq('id', pledge.id);

          if (updateError) {
            console.error(`Failed to update pledge ${pledge.id}:`, updateError);
            results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'error', error: updateError.message });
            continue;
          }

          confirmed++;
          results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'confirmed', stripe_status: setupIntent.status });

          // Send confirmation email (non-fatal)
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-bike-pledge-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ type: 'confirmation', pledge_id: pledge.id }),
            });
          } catch (emailErr) {
            console.error(`Failed to send confirmation email for pledge ${pledge.id} (non-fatal):`, emailErr);
          }

        } else if (['canceled', 'requires_payment_method'].includes(setupIntent.status)) {
          // SetupIntent failed or was cancelled
          await supabaseAdmin
            .from('bike_ride_pledges')
            .update({ charge_status: 'failed', charge_error: `Stripe SetupIntent ${setupIntent.status}` })
            .eq('id', pledge.id);
          failed++;
          results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'failed', stripe_status: setupIntent.status });

        } else if (pledge.created_at < twentyFourHoursAgo) {
          // Still processing after 24h — auto-cancel
          await supabaseAdmin
            .from('bike_ride_pledges')
            .update({ charge_status: 'cancelled', charge_error: `Stale pending (Stripe status: ${setupIntent.status}) - auto-cancelled after 24h` })
            .eq('id', pledge.id);
          autoCancelled++;
          results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'auto_cancelled', stripe_status: setupIntent.status });

        } else {
          // Still in progress, leave it alone
          skipped++;
          results.push({ pledge_id: pledge.id, pledger_email: pledge.pledger_email, action: 'skipped', stripe_status: setupIntent.status });
        }

      } catch (pledgeError) {
        console.error(`Error processing pledge ${pledge.id}:`, pledgeError);
        skipped++;
        results.push({ 
          pledge_id: pledge.id, 
          pledger_email: pledge.pledger_email, 
          action: 'error', 
          error: pledgeError instanceof Error ? pledgeError.message : 'Unknown error' 
        });
      }
    }

    const summary = { confirmed, failed, auto_cancelled: autoCancelled, skipped, total_processed: pendingPledges.length };
    console.log('Reconciliation complete:', summary);

    return new Response(
      JSON.stringify({ summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reconcile-bike-pledges:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
