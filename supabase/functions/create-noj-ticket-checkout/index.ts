import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ticketSchema = z.object({
  quantity: z.number().int().min(1).max(10),
  email: z.string().email().max(255).toLowerCase().trim(),
  contact_name: z.string().max(255).optional(),
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

    const requestBody = await req.json();
    const validationResult = ticketSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }

    const { quantity, email, contact_name } = validationResult.data;

    // Get Stripe mode from app_settings
    const { data: modeSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_mode')
      .single();
    const mode = modeSetting?.setting_value || 'test';

    const stripeKey = mode === 'live'
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');

    if (!stripeKey) {
      throw new Error(`Stripe ${mode} secret key not configured`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Create or get customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name: contact_name || undefined,
      });
    }

    const totalAmount = 50 * quantity;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1TAAAv3s4yIkp83qLmqN5y7C',
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/night-of-joy?payment=success&type=ticket`,
      cancel_url: `${req.headers.get('origin')}/night-of-joy`,
      metadata: {
        type: 'donation',
        donation_type: 'night-of-joy-ticket',
        frequency: 'one-time',
        amount: totalAmount.toString(),
        source: 'night-of-joy',
        tier_name: `A Night of Joy – Event Ticket${quantity > 1 ? ` (×${quantity})` : ''}`,
        contact_name: contact_name || '',
        quantity: quantity.toString(),
      },
    });

    console.log('Night of Joy ticket checkout created:', session.id, { quantity, totalAmount });

    // Create pending donation record
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    const donorId = profile?.id ?? null;
    const donorEmail = profile ? null : email;

    const { error: insertError } = await supabaseAdmin.from("donations").insert({
      donor_id: donorId,
      donor_email: donorEmail,
      amount: totalAmount,
      amount_charged: totalAmount,
      frequency: 'one-time',
      status: 'pending',
      started_at: new Date().toISOString(),
      stripe_mode: mode,
      stripe_customer_id: customer.id,
      stripe_checkout_session_id: session.id,
    });

    if (insertError) {
      console.error('Failed to create donation record:', insertError);
    } else {
      console.log('Pending donation record created for NOJ ticket');
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-noj-ticket-checkout:', error instanceof Error ? error.message : error);
    const errorMessage = error instanceof Error && error.message.includes('Validation failed')
      ? error.message
      : 'Failed to create checkout session. Please try again.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
