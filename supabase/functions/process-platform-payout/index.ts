import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[process-platform-payout] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting weekly platform payout processing');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get payout reserve amount from settings (default $100)
    const { data: reserveSetting } = await supabaseClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'payout_reserve_amount')
      .single();

    const reserveAmount = Number(reserveSetting?.setting_value ?? 100);
    const reserveAmountCents = reserveAmount * 100;

    logStep('Reserve amount configured', { reserveAmount, reserveAmountCents });

    // Process both live and test mode
    const modes = ['live', 'test'] as const;
    const results: any[] = [];

    for (const mode of modes) {
      const stripeKey = mode === 'live'
        ? Deno.env.get('MARKETPLACE_STRIPE_SECRET_KEY_LIVE')
        : Deno.env.get('MARKETPLACE_STRIPE_SECRET_KEY_TEST');

      if (!stripeKey) {
        logStep(`Skipping ${mode} mode - no API key configured`);
        continue;
      }

      logStep(`Processing ${mode} mode`);

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Get current balance
      const balance = await stripe.balance.retrieve();
      const availableUsd = balance.available.find((b: { currency: string; amount: number }) => b.currency === 'usd');
      const availableAmount = availableUsd?.amount || 0;

      logStep(`${mode} mode balance`, { availableAmount: availableAmount / 100 });

      // Calculate payout amount (keep reserve)
      const payoutAmountCents = availableAmount - reserveAmountCents;

      if (payoutAmountCents <= 0) {
        logStep(`${mode} mode: insufficient balance for payout`, {
          available: availableAmount / 100,
          reserve: reserveAmount,
          wouldPayout: 0
        });
        results.push({
          mode,
          success: true,
          skipped: true,
          reason: 'Insufficient balance (below reserve)',
          availableBalance: availableAmount / 100,
          reserveAmount,
          payoutAmount: 0
        });
        continue;
      }

      logStep(`${mode} mode: creating payout`, {
        payoutAmount: payoutAmountCents / 100,
        keepingReserve: reserveAmount
      });

      try {
        // Create the payout
        const payout = await stripe.payouts.create({
          amount: payoutAmountCents,
          currency: 'usd',
          description: `Weekly platform payout (reserve: $${reserveAmount})`,
          metadata: {
            type: 'weekly_platform_payout',
            reserve_amount: reserveAmount.toString(),
            processed_at: new Date().toISOString()
          }
        });

        logStep(`${mode} mode: payout created`, { payoutId: payout.id });

        results.push({
          mode,
          success: true,
          payoutId: payout.id,
          payoutAmount: payoutAmountCents / 100,
          remainingBalance: reserveAmount,
          arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null
        });

      } catch (payoutError: any) {
        logStep(`${mode} mode: payout failed`, { error: payoutError.message });
        results.push({
          mode,
          success: false,
          error: payoutError.message,
          availableBalance: availableAmount / 100
        });
      }
    }

    logStep('Payout processing complete', { results });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        reserveAmount,
        processedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[process-platform-payout] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
