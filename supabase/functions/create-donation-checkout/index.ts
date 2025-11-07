import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const donationSchema = z.object({
  amount: z.number()
    .min(5, "Minimum donation is $5")
    .max(100000, "Maximum donation is $100,000")
    .finite("Amount must be a valid number"),
  frequency: z.enum(['monthly', 'one-time'], {
    errorMap: () => ({ message: "Frequency must be 'monthly' or 'one-time'" })
  }),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim(),
  coverStripeFee: z.boolean().optional().default(false),
  force_test_mode: z.boolean().optional().default(false)
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

    const requestBody = await req.json();

    // Validate inputs with Zod
    const validationResult = donationSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      console.error('Validation error:', errors);
      throw new Error(`Validation failed: ${errors}`);
    }

    const { force_test_mode } = validationResult.data;

    // Get Stripe mode from app_settings (unless force_test_mode is true)
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

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    const { amount, frequency, email, coverStripeFee } = validationResult.data;

    // Calculate final amount including Stripe fee if user chose to cover it
    let finalAmount = amount;
    if (coverStripeFee) {
      finalAmount = (amount + 0.30) / 0.971;
    }

    // Sanitize for logging
    const sanitizedEmail = email.substring(0, 3) + '***@' + email.split('@')[1];
    console.log('Creating donation checkout:', { 
      amount, 
      finalAmount,
      coverStripeFee,
      frequency, 
      email: sanitizedEmail 
    });

    const amountInCents = Math.round(finalAmount * 100);

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
              name: `Donation to Best Day Ever Ministries`,
              description: frequency === 'monthly' 
                ? 'Monthly donation to support Best Day Ever Ministries'
                : 'One-time donation to support Best Day Ever Ministries',
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
      success_url: `${req.headers.get('origin')}/support?donation=success`,
      cancel_url: `${req.headers.get('origin')}/support`,
      metadata: {
        type: 'donation',
        frequency,
        amount: amount.toString(),
        coverStripeFee: coverStripeFee.toString(),
        donation_type: 'general',
      },
      ...(frequency === 'monthly' && {
        subscription_data: {
          metadata: {
            type: 'donation',
            frequency,
            amount: amount.toString(),
            coverStripeFee: coverStripeFee.toString(),
            donation_type: 'general',
          },
        },
      }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Donation checkout session created:', session.id);

    // Create the donation record immediately (status will be updated by webhook)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    // ALWAYS populate both donor_id (if user exists) AND donor_email
    await supabaseAdmin.from("donations").insert({
      donor_id: profile?.id || null,      // Set if user exists
      donor_email: email,                  // ALWAYS set this
      amount: amount,
      frequency: frequency,
      status: 'pending',
      started_at: new Date().toISOString(),
      stripe_mode: mode,
      stripe_customer_id: customer.id,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-donation-checkout:', {
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    
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
