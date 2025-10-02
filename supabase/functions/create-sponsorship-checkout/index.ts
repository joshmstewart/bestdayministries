import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { bestie_id, amount, frequency, email } = await req.json();

    console.log('Creating sponsorship checkout:', { bestie_id, amount, frequency, email });

    // Validate inputs
    if (!bestie_id || !amount || !frequency || !email) {
      throw new Error('Missing required fields');
    }

    if (amount < 10) {
      throw new Error('Minimum sponsorship amount is $10');
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    // Create or get customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
      });
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Bestie Sponsorship`,
              description: frequency === 'monthly' 
                ? 'Monthly sponsorship of a Bestie at Best Day Ever Ministries'
                : 'One-time sponsorship of a Bestie at Best Day Ever Ministries',
            },
            unit_amount: amountInCents,
            ...(frequency === 'monthly' && {
              recurring: {
                interval: 'month',
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: frequency === 'monthly' ? 'subscription' : 'payment',
      success_url: `${req.headers.get('origin')}/sponsorship-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/sponsor-bestie`,
      metadata: {
        bestie_id,
        frequency,
        amount: amount.toString(),
      },
      // Add subscription metadata so webhook can access it
      ...(frequency === 'monthly' && {
        subscription_data: {
          metadata: {
            bestie_id,
            frequency,
            amount: amount.toString(),
          },
        },
      }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Checkout session created:', session.id);

    // For one-time payments, create the sponsorship record immediately
    if (frequency === 'one-time') {
      // Get user by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profile) {
        await supabaseAdmin.from("sponsorships").insert({
          sponsor_id: profile.id,
          bestie_id: bestie_id,
          amount: amount,
          frequency: 'one-time',
          status: 'pending',
          started_at: new Date().toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-sponsorship-checkout:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
