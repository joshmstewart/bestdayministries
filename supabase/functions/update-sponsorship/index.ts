import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { sponsorship_id, new_amount } = await req.json();

    console.log('Updating sponsorship:', { sponsorship_id, new_amount, user_id: user.id });

    // Validate inputs
    if (!sponsorship_id || !new_amount) {
      throw new Error('Missing required fields');
    }

    if (new_amount < 10) {
      throw new Error('Minimum sponsorship amount is $10');
    }

    // Get sponsorship details
    const { data: sponsorship, error: sponsorshipError } = await supabaseAdmin
      .from("sponsorships")
      .select("*")
      .eq("id", sponsorship_id)
      .eq("sponsor_id", user.id)
      .eq("status", "active")
      .eq("frequency", "monthly")
      .single();

    if (sponsorshipError || !sponsorship) {
      throw new Error('Sponsorship not found or not authorized');
    }

    // Get user email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile?.email) {
      throw new Error('User email not found');
    }

    // Find Stripe customer
    const customers = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      throw new Error('Stripe customer not found');
    }

    const customer = customers.data[0];

    // Find active subscription for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 100,
    });

    // Find the subscription matching this sponsorship
    const subscription = subscriptions.data.find((sub: Stripe.Subscription) => 
      sub.metadata.bestie_id === sponsorship.bestie_id
    );

    if (!subscription) {
      throw new Error('Active Stripe subscription not found');
    }

    // Update subscription amount
    const newAmountInCents = Math.round(new_amount * 100);
    
    // Update the subscription item's price
    await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Bestie Sponsorship',
            description: 'Monthly sponsorship of a Bestie at Best Day Ever Ministries',
          },
          unit_amount: newAmountInCents,
          recurring: {
            interval: 'month',
          },
        },
      }],
      proration_behavior: 'none', // Don't prorate, start new amount next billing cycle
    });

    // Update sponsorship in database
    await supabaseAdmin
      .from("sponsorships")
      .update({ amount: new_amount })
      .eq("id", sponsorship_id);

    console.log('Sponsorship updated successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Sponsorship amount updated successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in update-sponsorship:', error);
    
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
