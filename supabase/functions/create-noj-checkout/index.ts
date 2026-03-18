import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const checkoutSchema = z.object({
  amount: z.number()
    .min(100, "Minimum amount is $100")
    .max(100000, "Maximum amount is $100,000"),
  tier_name: z.string().max(200).optional(),
  email: z.string().email().max(255).toLowerCase().trim(),
  contact_name: z.string().max(255).optional(),
  business_name: z.string().max(255).optional(),
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

    const requestBody = await req.json();
    const validationResult = checkoutSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }

    const { amount, tier_name, email, contact_name, business_name, cover_stripe_fee } = validationResult.data;

    // Calculate fee-covered amount if requested
    const finalAmount = cover_stripe_fee
      ? Math.round(((amount + 0.30) / 0.971) * 100) / 100
      : amount;

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

    const amountInCents = Math.round(finalAmount * 100);
    const tierLabel = tier_name || `$${amount.toLocaleString()} Sponsorship`;

    // Create or get customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name: contact_name || undefined,
        metadata: { business_name: business_name || '' },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `A Night of Joy – ${tierLabel}`,
              description: 'Event sponsorship for A Night of Joy fundraiser by Best Day Ministries',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/night-of-joy?payment=success`,
      cancel_url: `${req.headers.get('origin')}/night-of-joy`,
      metadata: {
        type: 'donation',
        donation_type: 'night-of-joy',
        frequency: 'one-time',
        amount: amount.toString(),
        source: 'night-of-joy',
        tier_name: tierLabel,
        contact_name: contact_name || '',
        business_name: business_name || '',
      },
    });

    console.log('Night of Joy checkout session created:', session.id, { tier: tierLabel, amount });

    // Create pending donation record (will be updated by webhook/reconciliation)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    // RESPECT donor_identifier_check CONSTRAINT
    const donorId = profile?.id ?? null;
    const donorEmail = profile ? null : email;

    const { error: insertError } = await supabaseAdmin.from("donations").insert({
      donor_id: donorId,
      donor_email: donorEmail,
      amount: amount,
      amount_charged: finalAmount,
      frequency: 'one-time',
      status: 'pending',
      started_at: new Date().toISOString(),
      stripe_mode: mode,
      stripe_customer_id: customer.id,
      stripe_checkout_session_id: session.id,
      designation: `A Night of Joy – ${tierLabel}`,
    });

    if (insertError) {
      console.error('Failed to create donation record:', insertError);
      // Don't fail the checkout - the webhook/reconciliation will handle it
    } else {
      console.log('Pending donation record created for NOJ payment');
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-noj-checkout:', error instanceof Error ? error.message : error);
    const errorMessage = error instanceof Error && error.message.includes('Validation failed')
      ? error.message
      : 'Failed to create checkout session. Please try again.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
