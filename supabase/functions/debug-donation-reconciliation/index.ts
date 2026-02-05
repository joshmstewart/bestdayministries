import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DonationDebugResult {
  donationId: string;
  fields: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_checkout_session_id: string | null;
    amount: number;
    frequency: string;
    created_at: string;
  };
  strategyChecks: {
    strategy1: { passes: boolean; reason: string };
    strategy2: { passes: boolean; reason: string };
    strategy3: { passes: boolean; reason: string };
  };
  stripeLookups: {
    checkoutSession: { attempted: boolean; found: boolean; data?: any; error?: string };
    subscription: { attempted: boolean; found: boolean; data?: any; error?: string };
    customerSearch: { attempted: boolean; found: boolean; data?: any; error?: string };
  };
  recommendedAction: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { donations } = await req.json();

    if (!donations || !Array.isArray(donations)) {
      throw new Error('Invalid donations array');
    }

    const results: DonationDebugResult[] = [];

    for (const donation of donations) {
      const result: DonationDebugResult = {
        donationId: donation.id,
        fields: {
          stripe_customer_id: donation.stripe_customer_id,
          stripe_subscription_id: donation.stripe_subscription_id,
          stripe_checkout_session_id: donation.stripe_checkout_session_id,
          amount: donation.amount,
          frequency: donation.frequency,
          created_at: donation.created_at,
        },
        strategyChecks: {
          strategy1: { passes: false, reason: '' },
          strategy2: { passes: false, reason: '' },
          strategy3: { passes: false, reason: '' },
        },
        stripeLookups: {
          checkoutSession: { attempted: false, found: false },
          subscription: { attempted: false, found: false },
          customerSearch: { attempted: false, found: false },
        },
        recommendedAction: '',
      };

      // Check Strategy 1: Has checkout session ID
      if (donation.stripe_checkout_session_id) {
        result.strategyChecks.strategy1.passes = true;
        result.strategyChecks.strategy1.reason = `Has checkout session ID: ${donation.stripe_checkout_session_id}`;
        
        // Try to lookup in Stripe
        result.stripeLookups.checkoutSession.attempted = true;
        try {
          const stripeKey = donation.stripe_mode === 'live' 
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');
          
          if (!stripeKey) {
            result.stripeLookups.checkoutSession.error = `No Stripe key found for mode: ${donation.stripe_mode}`;
          } else {
            const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
            const session = await stripe.checkout.sessions.retrieve(
              donation.stripe_checkout_session_id,
              { expand: ['subscription', 'payment_intent'] }
            );
            result.stripeLookups.checkoutSession.found = true;
            result.stripeLookups.checkoutSession.data = {
              id: session.id,
              status: session.status,
              payment_status: session.payment_status,
              subscription: session.subscription ? 
                (typeof session.subscription === 'string' ? session.subscription : session.subscription.id) 
                : null,
              payment_intent: session.payment_intent ?
                (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id)
                : null,
            };
          }
        } catch (error: any) {
          result.stripeLookups.checkoutSession.error = error.message;
        }
      } else {
        result.strategyChecks.strategy1.passes = false;
        result.strategyChecks.strategy1.reason = 'No checkout session ID in database';
      }

      // Check Strategy 2: Has subscription ID and is monthly
      if (donation.stripe_subscription_id && donation.frequency === 'monthly') {
        result.strategyChecks.strategy2.passes = true;
        result.strategyChecks.strategy2.reason = `Has subscription ID: ${donation.stripe_subscription_id}`;
        
        // Try to lookup in Stripe
        result.stripeLookups.subscription.attempted = true;
        try {
          const stripeKey = donation.stripe_mode === 'live' 
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');
          
          if (!stripeKey) {
            result.stripeLookups.subscription.error = `No Stripe key found for mode: ${donation.stripe_mode}`;
          } else {
            const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
            const subscription = await stripe.subscriptions.retrieve(donation.stripe_subscription_id);
            result.stripeLookups.subscription.found = true;
            result.stripeLookups.subscription.data = {
              id: subscription.id,
              status: subscription.status,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
            };
          }
        } catch (error: any) {
          result.stripeLookups.subscription.error = error.message;
        }
      } else {
        result.strategyChecks.strategy2.passes = false;
        if (!donation.stripe_subscription_id) {
          result.strategyChecks.strategy2.reason = 'No subscription ID in database';
        } else if (donation.frequency !== 'monthly') {
          result.strategyChecks.strategy2.reason = `Frequency is ${donation.frequency}, not monthly`;
        }
      }

      // Check Strategy 3: Has customer ID and amount
      if (donation.stripe_customer_id && donation.amount) {
        result.strategyChecks.strategy3.passes = true;
        result.strategyChecks.strategy3.reason = `Has customer ID (${donation.stripe_customer_id}) and amount ($${donation.amount})`;
        
        // Try to search in Stripe
        result.stripeLookups.customerSearch.attempted = true;
        try {
          const stripeKey = donation.stripe_mode === 'live' 
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');
          
          if (!stripeKey) {
            result.stripeLookups.customerSearch.error = `No Stripe key found for mode: ${donation.stripe_mode}`;
          } else {
            const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
            const createdAt = new Date(donation.created_at);
            const oneHourBefore = Math.floor((createdAt.getTime() - 3600000) / 1000);
            const oneHourAfter = Math.floor((createdAt.getTime() + 3600000) / 1000);
            
            const searches = [];

            // Search subscriptions
            if (donation.frequency === 'monthly') {
              try {
                const subscriptions = await stripe.subscriptions.list({
                  customer: donation.stripe_customer_id,
                  created: { gte: oneHourBefore, lte: oneHourAfter },
                  limit: 10,
                });
                searches.push({
                  type: 'subscriptions',
                  count: subscriptions.data.length,
                  matches: subscriptions.data.filter((s: any) => {
                    const subAmount = s.items.data[0]?.price?.unit_amount || 0;
                    return Math.abs(subAmount - donation.amount * 100) < 100;
                  }),
                });
              } catch (error: any) {
                searches.push({ type: 'subscriptions', error: error.message });
              }
            }

            // Search payment intents
            try {
              const paymentIntents = await stripe.paymentIntents.list({
                customer: donation.stripe_customer_id,
                created: { gte: oneHourBefore, lte: oneHourAfter },
                limit: 10,
              });
              searches.push({
                type: 'payment_intents',
                count: paymentIntents.data.length,
                matches: paymentIntents.data.filter((pi: any) => {
                  return Math.abs(pi.amount - donation.amount * 100) < 100;
                }),
              });
            } catch (error: any) {
              searches.push({ type: 'payment_intents', error: error.message });
            }

            result.stripeLookups.customerSearch.found = searches.some(s => s.matches && s.matches.length > 0);
            result.stripeLookups.customerSearch.data = {
              search_window: {
                created_at: donation.created_at,
                start: new Date(oneHourBefore * 1000).toISOString(),
                end: new Date(oneHourAfter * 1000).toISOString(),
              },
              searches,
            };
          }
        } catch (error: any) {
          result.stripeLookups.customerSearch.error = error.message;
        }
      } else {
        result.strategyChecks.strategy3.passes = false;
        if (!donation.stripe_customer_id) {
          result.strategyChecks.strategy3.reason = 'No customer ID in database';
        } else if (!donation.amount) {
          result.strategyChecks.strategy3.reason = 'No amount in database';
        }
      }

      // Determine recommended action
      if (result.stripeLookups.checkoutSession.found) {
        result.recommendedAction = 'Strategy 1 should work - checkout session found in Stripe';
      } else if (result.stripeLookups.subscription.found) {
        result.recommendedAction = 'Strategy 2 should work - subscription found in Stripe';
      } else if (result.stripeLookups.customerSearch.found) {
        result.recommendedAction = 'Strategy 3 should work - matching transaction found via customer search';
      } else if (result.stripeLookups.customerSearch.attempted && !result.stripeLookups.customerSearch.error) {
        result.recommendedAction = 'NO MATCH FOUND - No Stripe record found for this donation. May need manual investigation.';
      } else {
        const errors = [
          result.stripeLookups.checkoutSession.error,
          result.stripeLookups.subscription.error,
          result.stripeLookups.customerSearch.error,
        ].filter(Boolean);
        
        if (errors.length > 0) {
          result.recommendedAction = `ERRORS OCCURRED - Check Stripe API errors: ${errors.join('; ')}`;
        } else {
          result.recommendedAction = 'INSUFFICIENT DATA - Missing key fields to perform any strategy';
        }
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Debug function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
