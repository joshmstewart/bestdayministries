import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const pledgeSchema = z.object({
  event_id: z.string().uuid("Invalid event ID"),
  pledger_name: z.string().min(1).max(200),
  pledger_email: z.string().email().max(255).toLowerCase().trim(),
  pledge_type: z.enum(['per_mile', 'flat']),
  cents_per_mile: z.number().min(1).max(500).optional(),
  flat_amount: z.number().min(1).max(10000).optional(),
  message: z.string().max(500).optional(),
  force_test_mode: z.boolean().optional().default(false),
  cover_stripe_fee: z.boolean().optional().default(false),
});

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

    const body = await req.json();
    const validation = pledgeSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }

    const { event_id, pledger_name, pledger_email, pledge_type, cents_per_mile, flat_amount, message, force_test_mode, cover_stripe_fee } = validation.data;

    if (pledge_type === 'per_mile' && !cents_per_mile) {
      throw new Error('cents_per_mile is required for per_mile pledges');
    }
    if (pledge_type === 'flat' && !flat_amount) {
      throw new Error('flat_amount is required for flat pledges');
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('bike_ride_events')
      .select('*')
      .eq('id', event_id)
      .eq('status', 'active')
      .single();

    if (eventError || !event) {
      throw new Error('Event not found or not active');
    }

    // Get Stripe mode
    let mode = 'test';
    if (!force_test_mode) {
      const { data: modeSetting } = await supabaseAdmin
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'stripe_mode')
        .single();
      mode = modeSetting?.setting_value || 'test';
    }

    const stripeKey = mode === 'live'
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');

    if (!stripeKey) {
      throw new Error(`Stripe ${mode} secret key not configured`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    // Calculate charge amount based on pledge type
    let baseAmount: number;
    let designation: string;
    if (pledge_type === 'per_mile') {
      baseAmount = (cents_per_mile! / 100) * Number(event.mile_goal);
      designation = `Bike Ride: ${event.title} (${cents_per_mile}¢/mile × ${event.mile_goal} miles)`;
    } else {
      baseAmount = flat_amount!;
      designation = `Bike Ride: ${event.title}`;
    }

    // Calculate final amount with fee coverage
    let finalAmount = baseAmount;
    if (cover_stripe_fee) {
      finalAmount = (baseAmount + 0.30) / 0.971;
    }

    const amountInCents = Math.round(finalAmount * 100);

    // Get or create Stripe customer
    const existingCustomers = await stripe.customers.list({ email: pledger_email, limit: 1 });
    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: pledger_email,
        name: pledger_name,
        metadata: { source: 'bike_ride_donation' },
      });
    }

    // Build success/cancel URLs
    const origin = req.headers.get('origin') || '';
    const eventSlug = event.slug || event.id;

    // Create Stripe Checkout Session (immediate charge)
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: designation,
              description: `Supporting ${event.rider_name}'s ${event.mile_goal}-mile ride`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/bike-rides/${eventSlug}?donation=success&name=${encodeURIComponent(pledger_name)}`,
      cancel_url: `${origin}/bike-rides/${eventSlug}`,
      metadata: {
        type: 'donation',
        donation_type: 'bike_ride',
        event_id,
        event_title: event.title,
        pledge_type,
        cents_per_mile: pledge_type === 'per_mile' ? String(cents_per_mile) : '0',
        flat_amount: pledge_type === 'flat' ? String(flat_amount) : '0',
        mile_goal: String(event.mile_goal),
        pledger_name,
        pledger_email,
        amount: baseAmount.toString(),
        coverStripeFee: cover_stripe_fee.toString(),
        cover_stripe_fee: cover_stripe_fee ? 'true' : 'false',
        message: message || '',
      },
    });

    console.log('Bike ride donation checkout session created:', session.id);

    // Look up profile for donor_id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", pledger_email)
      .maybeSingle();

    // RESPECT donor_identifier_check CONSTRAINT
    const donorId = profile?.id ?? null;
    const donorEmail = profile ? null : pledger_email;

    // Create pending donation record (will be updated by webhook/reconciliation)
    const { error: insertError } = await supabaseAdmin
      .from("donations")
      .insert({
        donor_id: donorId,
        donor_email: donorEmail,
        amount: baseAmount,
        amount_charged: finalAmount,
        frequency: 'one-time',
        status: 'pending',
        designation: designation,
        started_at: new Date().toISOString(),
        stripe_mode: mode,
        stripe_customer_id: customer.id,
        stripe_checkout_session_id: session.id,
      });

    if (insertError) {
      console.error('Failed to create donation record:', insertError);
      // Don't fail the checkout - the reconciliation system will catch it
    }

    // Also store a record in bike_ride_pledges for backward compatibility / admin tracking
    const pledgerUserId = profile?.id || null;
    const { error: pledgeError } = await supabaseAdmin
      .from('bike_ride_pledges')
      .insert({
        event_id,
        pledger_email,
        pledger_name,
        pledger_user_id: pledgerUserId,
        pledge_type,
        cents_per_mile: pledge_type === 'per_mile' ? cents_per_mile : null,
        flat_amount: pledge_type === 'flat' ? flat_amount : null,
        stripe_customer_id: customer.id,
        stripe_setup_intent_id: null,
        stripe_mode: mode,
        message: message || null,
        cover_stripe_fee: cover_stripe_fee,
        charge_status: 'pending',
      });

    if (pledgeError) {
      console.error('Error inserting bike_ride_pledge (non-fatal):', pledgeError);
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        amount: baseAmount,
        amount_charged: finalAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-bike-pledge:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
