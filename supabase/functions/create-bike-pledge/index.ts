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
  pledge_type: z.enum(['per_mile']),
  cents_per_mile: z.number().min(5).max(500).optional(),
  message: z.string().max(500).optional(),
  force_test_mode: z.boolean().optional().default(false),
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

    const { event_id, pledger_name, pledger_email, pledge_type, cents_per_mile, message, force_test_mode } = validation.data;

    if (pledge_type === 'per_mile' && !cents_per_mile) {
      throw new Error('cents_per_mile is required for per_mile pledges');
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

    // Get or create Stripe customer
    const existingCustomers = await stripe.customers.list({ email: pledger_email, limit: 1 });
    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: pledger_email,
        name: pledger_name,
        metadata: { source: 'bike_ride_pledge' },
      });
    }

    // Create Setup Intent (saves card, no charge)
    const maxTotal = (cents_per_mile! / 100) * Number(event.mile_goal);
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        event_id,
        pledge_type,
        cents_per_mile: String(cents_per_mile),
        max_total: String(maxTotal.toFixed(2)),
        pledger_name,
        pledger_email,
      },
    });

    // Get user ID from auth header if available
    let pledgerUserId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (user) pledgerUserId = user.id;
    }

    // Store pledge in database
    const { data: pledge, error: pledgeError } = await supabaseAdmin
      .from('bike_ride_pledges')
      .insert({
        event_id,
        pledger_email,
        pledger_name,
        pledger_user_id: pledgerUserId,
        pledge_type,
        cents_per_mile,
        stripe_customer_id: customer.id,
        stripe_setup_intent_id: setupIntent.id,
        stripe_mode: mode,
        message: message || null,
      })
      .select()
      .single();

    if (pledgeError) {
      console.error('Error inserting pledge:', pledgeError);
      throw new Error('Failed to save pledge');
    }

    // NOTE: Confirmation email is sent AFTER card is confirmed on the frontend,
    // not here (pledge is still pending at this point).

    return new Response(
      JSON.stringify({
        client_secret: setupIntent.client_secret,
        pledge_id: pledge.id,
        max_total: maxTotal,
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
