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

    const { event_id, actual_miles } = await req.json();

    if (!event_id || actual_miles === undefined || actual_miles === null) {
      throw new Error('event_id and actual_miles are required');
    }

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

    // Update event with actual miles
    await supabaseAdmin
      .from('bike_ride_events')
      .update({ actual_miles: miles, status: 'completed' })
      .eq('id', event_id);

    // Get all pending per-mile pledges
    const { data: pledges } = await supabaseAdmin
      .from('bike_ride_pledges')
      .select('*')
      .eq('event_id', event_id)
      .eq('pledge_type', 'per_mile')
      .eq('charge_status', 'pending');

    if (!pledges || pledges.length === 0) {
      // Update status
      await supabaseAdmin
        .from('bike_ride_events')
        .update({ status: 'charges_processed' })
        .eq('id', event_id);

      return new Response(
        JSON.stringify({ message: 'No pending pledges to charge', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const pledge of pledges) {
      try {
        // Calculate charge amount
        const totalDollars = (pledge.cents_per_mile / 100) * miles;
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

        // Get Stripe key based on pledge mode
        const stripeKey = pledge.stripe_mode === 'live'
          ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
          : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!stripeKey) {
          throw new Error(`Stripe ${pledge.stripe_mode} key not configured`);
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

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

    // Update event status
    await supabaseAdmin
      .from('bike_ride_events')
      .update({ status: 'charges_processed' })
      .eq('id', event_id);

    const summary = {
      total: results.length,
      charged: results.filter(r => r.status === 'charged').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      total_collected: results
        .filter(r => r.status === 'charged')
        .reduce((s, r) => s + (r.amount || 0), 0),
    };

    return new Response(
      JSON.stringify({ summary, results }),
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
