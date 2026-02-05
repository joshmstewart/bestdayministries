import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();
    
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    console.log(`Checking Stripe customer: ${customerId}`);

    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    // Get payment intents for this customer (last 30 days)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    // Get charges for this customer
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    });

    return new Response(
      JSON.stringify({
        customer_id: customerId,
        subscriptions: {
          total: subscriptions.data.length,
          active: subscriptions.data.filter((s: any) => s.status === 'active').length,
          details: subscriptions.data.map((s: any) => ({
            id: s.id,
            status: s.status,
            amount: s.items.data[0]?.price?.unit_amount,
            currency: s.currency,
            created: new Date(s.created * 1000).toISOString(),
            current_period_start: new Date(s.current_period_start * 1000).toISOString(),
            current_period_end: new Date(s.current_period_end * 1000).toISOString(),
          }))
        },
        payment_intents: {
          total: paymentIntents.data.length,
          succeeded: paymentIntents.data.filter((pi: any) => pi.status === 'succeeded').length,
          details: paymentIntents.data.map((pi: any) => ({
            id: pi.id,
            status: pi.status,
            amount: pi.amount,
            currency: pi.currency,
            created: new Date(pi.created * 1000).toISOString(),
          }))
        },
        charges: {
          total: charges.data.length,
          succeeded: charges.data.filter((c: any) => c.status === 'succeeded').length,
          details: charges.data.map((c: any) => ({
            id: c.id,
            status: c.status,
            amount: c.amount,
            currency: c.currency,
            created: new Date(c.created * 1000).toISOString(),
          }))
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking Stripe customer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
