import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting: 600ms between Stripe charges to stay well under 100 req/s limit
const DELAY_BETWEEN_CHARGES_MS = 600;
// Max pledges per invocation to avoid edge function timeout (~60s)
const DEFAULT_BATCH_SIZE = 25;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const { data: { user } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (!user) throw new Error('Not authenticated');

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'owner'].includes(roleData.role)) {
      throw new Error('Admin access required');
    }

    const { event_id, actual_miles, batch_size } = await req.json();

    if (!event_id || actual_miles === undefined || actual_miles === null) {
      throw new Error('event_id and actual_miles are required');
    }

    const maxBatch = Math.min(batch_size || DEFAULT_BATCH_SIZE, 50);

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('bike_ride_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) throw new Error('Event not found');

    // Validate actual_miles
    const miles = Number(actual_miles);
    if (isNaN(miles) || miles < 0) throw new Error('actual_miles must be a positive number');
    if (miles > Number(event.mile_goal)) {
      throw new Error(`actual_miles (${miles}) cannot exceed mile_goal (${event.mile_goal})`);
    }

    // Update event with actual miles (only set to completed on first run)
    await supabaseAdmin
      .from('bike_ride_events')
      .update({ actual_miles: miles, status: 'completed' })
      .eq('id', event_id);

    // Get ALL confirmed per-mile pledges to know total remaining
    const { data: allPledges, error: countError } = await supabaseAdmin
      .from('bike_ride_pledges')
      .select('id', { count: 'exact' })
      .eq('event_id', event_id)
      .eq('pledge_type', 'per_mile')
      .eq('charge_status', 'confirmed');

    const totalRemaining = allPledges?.length ?? 0;

    // Get batch of confirmed per-mile pledges (limited to batch size)
    const { data: pledges } = await supabaseAdmin
      .from('bike_ride_pledges')
      .select('*')
      .eq('event_id', event_id)
      .eq('pledge_type', 'per_mile')
      .eq('charge_status', 'confirmed')
      .order('created_at', { ascending: true })
      .limit(maxBatch);

    if (!pledges || pledges.length === 0) {
      // All done — mark event as fully processed
      await supabaseAdmin
        .from('bike_ride_events')
        .update({ status: 'charges_processed' })
        .eq('id', event_id);

      return new Response(
        JSON.stringify({ message: 'No pending pledges to charge', results: [], has_more: false, remaining: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (let i = 0; i < pledges.length; i++) {
      const pledge = pledges[i];

      // Rate limit: wait between charges (skip delay on first one)
      if (i > 0) {
        await delay(DELAY_BETWEEN_CHARGES_MS);
      }

      try {
        // Get Stripe key based on pledge mode
        const stripeKey = pledge.stripe_mode === 'live'
          ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
          : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!stripeKey) {
          throw new Error(`Stripe ${pledge.stripe_mode} key not configured`);
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

        // Calculate charge amount
        const baseDollars = (pledge.cents_per_mile / 100) * miles;
        
        // Check if pledge has fee coverage from setup intent metadata
        let coverFee = false;
        if (pledge.stripe_setup_intent_id) {
          try {
            const setupIntent = await stripe.setupIntents.retrieve(pledge.stripe_setup_intent_id);
            coverFee = setupIntent.metadata?.cover_stripe_fee === 'true';
          } catch { /* ignore */ }
        }
        
        const totalDollars = coverFee && baseDollars > 0
          ? Math.round(((baseDollars + 0.30) / 0.971) * 100) / 100
          : baseDollars;
        const totalCents = Math.round(totalDollars * 100);

        if (totalCents < 50) {
          // Stripe minimum charge is $0.50
          await supabaseAdmin
            .from('bike_ride_pledges')
            .update({
              charge_status: 'failed',
              charge_error: 'Amount too small (below Stripe $0.50 minimum)',
              calculated_total: totalDollars,
            })
            .eq('id', pledge.id);

          results.push({
            pledge_id: pledge.id,
            pledger_name: pledge.pledger_name,
            status: 'skipped',
            reason: 'Below Stripe minimum ($0.50)',
            amount: totalDollars,
          });
          continue;
        }

        // Get the payment method from the setup intent
        let paymentMethodId = pledge.stripe_payment_method_id;

        if (!paymentMethodId && pledge.stripe_setup_intent_id) {
          const setupIntent = await stripe.setupIntents.retrieve(pledge.stripe_setup_intent_id);
          paymentMethodId = typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;
        }

        if (!paymentMethodId) {
          throw new Error('No payment method found');
        }

        // Create PaymentIntent and charge
        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalCents,
          currency: 'usd',
          customer: pledge.stripe_customer_id,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: `Bike ride pledge: ${pledge.cents_per_mile}¢/mile × ${miles} miles for "${event.title}"`,
          metadata: {
            type: 'bike_ride_pledge',
            event_id: event.id,
            pledge_id: pledge.id,
            cents_per_mile: String(pledge.cents_per_mile),
            actual_miles: String(miles),
          },
        });

        // Update pledge record
        await supabaseAdmin
          .from('bike_ride_pledges')
          .update({
            charge_status: 'charged',
            calculated_total: totalDollars,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_payment_method_id: paymentMethodId,
          })
          .eq('id', pledge.id);

        // Create donation record so it appears in Donation History with proper tax receipts
        // CRITICAL: donor_identifier_check constraint requires EITHER donor_id OR donor_email, never both
        const donationDesignation = `Bike Ride Pledge: ${pledge.cents_per_mile}¢/mile × ${miles} mi — "${event.title}"`;
        try {
          const donationInsert: Record<string, unknown> = {
            amount: totalDollars,
            amount_charged: totalDollars,
            frequency: 'one-time',
            status: 'completed',
            stripe_mode: pledge.stripe_mode,
            stripe_customer_id: pledge.stripe_customer_id,
            stripe_payment_intent_id: paymentIntent.id,
            designation: donationDesignation,
            contact_name: pledge.pledger_name,
            started_at: new Date().toISOString(),
          };

          if (pledge.pledger_user_id) {
            donationInsert.donor_id = pledge.pledger_user_id;
            donationInsert.donor_email = null;
          } else {
            donationInsert.donor_email = pledge.pledger_email;
            donationInsert.donor_id = null;
          }

          const { data: newDonation, error: donationError } = await supabaseAdmin
            .from('donations')
            .insert(donationInsert)
            .select('id')
            .single();

          if (donationError) {
            console.error(`Failed to create donation for pledge ${pledge.id} (non-fatal):`, donationError);
          } else {
            console.log(`Created donation ${newDonation.id} for pledge ${pledge.id}`);

            // Generate tax receipt via existing system
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-missing-donation-receipts`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ donation_id: newDonation.id }),
              });
            } catch (receiptErr) {
              console.error(`Failed to generate receipt for donation ${newDonation.id} (non-fatal):`, receiptErr);
            }
          }
        } catch (donErr) {
          console.error(`Failed to create donation record for pledge ${pledge.id} (non-fatal):`, donErr);
        }

        // Send pledge-specific receipt email (fire and forget)
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-bike-pledge-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ type: 'receipt', pledge_id: pledge.id }),
          });
        } catch (emailErr) {
          console.error(`Failed to send receipt email for pledge ${pledge.id} (non-fatal):`, emailErr);
        }

        results.push({
          pledge_id: pledge.id,
          pledger_name: pledge.pledger_name,
          status: 'charged',
          amount: totalDollars,
          payment_intent_id: paymentIntent.id,
        });
      } catch (chargeError) {
        const errorMsg = chargeError instanceof Error ? chargeError.message : 'Unknown error';
        console.error(`Failed to charge pledge ${pledge.id}:`, errorMsg);

        await supabaseAdmin
          .from('bike_ride_pledges')
          .update({
            charge_status: 'failed',
            charge_error: errorMsg,
            calculated_total: (pledge.cents_per_mile / 100) * miles,
          })
          .eq('id', pledge.id);

        results.push({
          pledge_id: pledge.id,
          pledger_name: pledge.pledger_name,
          status: 'failed',
          error: errorMsg,
          amount: (pledge.cents_per_mile / 100) * miles,
        });
      }
    }

    // Check if there are more pledges remaining
    const processedCount = pledges.length;
    const hasMore = totalRemaining > processedCount;
    const remainingAfterBatch = Math.max(0, totalRemaining - processedCount);

    // Only mark fully processed if no more remain
    if (!hasMore) {
      await supabaseAdmin
        .from('bike_ride_events')
        .update({ status: 'charges_processed' })
        .eq('id', event_id);
    }

    const summary = {
      total: results.length,
      charged: results.filter(r => r.status === 'charged').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      total_collected: results
        .filter(r => r.status === 'charged')
        .reduce((s, r) => s + (r.amount || 0), 0),
      has_more: hasMore,
      remaining: remainingAfterBatch,
      batch_size: maxBatch,
    };

    return new Response(
      JSON.stringify({ summary, results, has_more: hasMore, remaining: remainingAfterBatch }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-bike-ride-charges:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
