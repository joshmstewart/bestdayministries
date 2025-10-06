import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const sponsorshipSchema = z.object({
  bestie_id: z.string().uuid("Invalid bestie ID format"),
  amount: z.number()
    .min(5, "Minimum sponsorship amount is $5")
    .max(100000, "Maximum sponsorship amount is $100,000")
    .finite("Amount must be a valid number"),
  frequency: z.enum(['monthly', 'one-time'], {
    errorMap: () => ({ message: "Frequency must be 'monthly' or 'one-time'" })
  }),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim()
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    const requestBody = await req.json();

    // Validate inputs with Zod
    const validationResult = sponsorshipSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      console.error('Validation error:', errors);
      throw new Error(`Validation failed: ${errors}`);
    }

    const { bestie_id, amount, frequency, email } = validationResult.data;

    // Sanitize for logging (truncate email)
    const sanitizedEmail = email.substring(0, 3) + '***@' + email.split('@')[1];
    console.log('Creating sponsorship checkout:', { 
      bestie_id, 
      amount, 
      frequency, 
      email: sanitizedEmail 
    });

    // Check if user is a bestie (prevent besties from sponsoring)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (profile && profile.role === 'bestie') {
      throw new Error('Besties cannot sponsor other besties at this time');
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
          stripe_mode: mode,
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
    // Log error securely (no PII)
    console.error('Error in create-sponsorship-checkout:', {
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    
    // Return generic error message to client (don't expose internals)
    const errorMessage = error instanceof Error && error.message.includes('Validation failed')
      ? error.message
      : 'Failed to create checkout session. Please try again.';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
