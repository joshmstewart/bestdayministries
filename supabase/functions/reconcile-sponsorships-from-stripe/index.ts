import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE-SPONSORSHIPS] ${step}${detailsStr}`);
};

interface ReconcileResult {
  action: 'found_missing' | 'already_exists' | 'skipped' | 'error';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  customerEmail?: string;
  amount?: number;
  bestieId?: string;
  bestieName?: string;
  frequency?: string;
  sponsorshipId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate: admin user required
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Authentication failed');

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner']);

    if (!roles || roles.length === 0) {
      throw new Error('Unauthorized: Admin access required');
    }

    logStep("Admin authenticated", { userId: user.id });

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { mode = 'live', dry_run = true } = body;

    logStep("Parameters", { mode, dry_run });

    // Initialize Stripe with the correct key
    const stripeKey = mode === 'live' 
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');
    
    if (!stripeKey) throw new Error(`Stripe ${mode} secret key not configured`);

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Step 1: Get ALL active subscriptions from Stripe
    logStep("Fetching active subscriptions from Stripe...");
    const allSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        status: 'active',
        limit: 100,
        expand: ['data.customer'],
      };
      if (startingAfter) params.starting_after = startingAfter;
      
      const batch = await stripe.subscriptions.list(params);
      allSubscriptions.push(...batch.data);
      hasMore = batch.has_more;
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    logStep("Total active Stripe subscriptions found", { count: allSubscriptions.length });

    // Filter to only sponsorship subscriptions (those with bestie_id in metadata)
    const sponsorshipSubs = allSubscriptions.filter(sub => 
      sub.metadata?.bestie_id || sub.metadata?.frequency
    );
    logStep("Sponsorship subscriptions (with bestie_id metadata)", { count: sponsorshipSubs.length });

    // Step 2: Get all existing sponsorship records from DB
    const { data: existingSponsorships, error: dbError } = await supabaseClient
      .from('sponsorships')
      .select('id, stripe_subscription_id, stripe_customer_id, sponsor_email, amount, status, stripe_mode')
      .eq('stripe_mode', mode);

    if (dbError) throw dbError;

    logStep("Existing DB sponsorship records", { count: existingSponsorships?.length || 0 });

    // Build lookup sets
    const existingSubIds = new Set(
      (existingSponsorships || [])
        .filter(s => s.stripe_subscription_id)
        .map(s => s.stripe_subscription_id)
    );

    // Step 3: Find missing sponsorships
    const results: ReconcileResult[] = [];
    const missingSponsorships: any[] = [];

    // Get sponsor_besties lookup for bestie_id mapping
    const { data: sponsorBesties } = await supabaseClient
      .from('sponsor_besties')
      .select('id, bestie_id, bestie_name');
    
    const sponsorBestieMap = new Map(
      (sponsorBesties || []).map(sb => [sb.id, sb])
    );

    for (const sub of sponsorshipSubs) {
      const result: ReconcileResult = {
        action: 'skipped',
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer as string,
        amount: (sub.items.data[0]?.price?.unit_amount || 0) / 100,
        frequency: sub.metadata?.frequency || 'monthly',
      };

      // Get customer email
      const customer = sub.customer as Stripe.Customer;
      result.customerEmail = customer?.email || undefined;

      // Check metadata
      const metadataBestieId = sub.metadata?.bestie_id;
      result.bestieId = metadataBestieId;

      // Look up bestie name
      const sponsorBestie = sponsorBestieMap.get(metadataBestieId);
      result.bestieName = sponsorBestie?.bestie_name || 'Unknown';

      // Use amount from metadata if available (includes fee coverage)
      if (sub.metadata?.amount) {
        result.amount = parseFloat(sub.metadata.amount);
      }

      if (existingSubIds.has(sub.id)) {
        result.action = 'already_exists';
        // Find the matching record
        const match = (existingSponsorships || []).find(s => s.stripe_subscription_id === sub.id);
        result.sponsorshipId = match?.id;
      } else {
        result.action = 'found_missing';
        logStep(`🚨 MISSING sponsorship for Stripe sub ${sub.id}`, {
          email: result.customerEmail,
          bestieId: metadataBestieId,
          bestieName: result.bestieName,
          amount: result.amount,
        });

        if (!dry_run) {
          // Look up user by email
          let userId: string | null = null;
          if (result.customerEmail) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('id')
              .eq('email', result.customerEmail)
              .maybeSingle();
            userId = profile?.id || null;
          }

          // Create the missing sponsorship
          const startedAt = new Date(sub.created * 1000);
          const { data: newSponsorship, error: insertError } = await supabaseClient
            .from('sponsorships')
            .insert({
              sponsor_id: userId,
              sponsor_email: userId ? null : result.customerEmail,
              sponsor_bestie_id: metadataBestieId,
              bestie_id: sponsorBestie?.bestie_id || null,
              amount: result.amount,
              frequency: result.frequency,
              status: 'active',
              started_at: startedAt.toISOString(),
              stripe_subscription_id: sub.id,
              stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
              stripe_mode: mode,
            })
            .select('id')
            .single();

          if (insertError) {
            result.action = 'error';
            result.error = insertError.message;
            logStep(`❌ Failed to create sponsorship for ${sub.id}`, { error: insertError.message });
          } else {
            result.sponsorshipId = newSponsorship?.id;
            logStep(`✅ Created missing sponsorship ${newSponsorship?.id} for ${sub.id}`);
          }
        }
      }

      results.push(result);
    }

    // Also check for one-time payments that might be missing
    // Search for recent successful checkout sessions with sponsorship metadata
    logStep("Checking for missing one-time sponsorship payments...");
    const recentSessions = await stripe.checkout.sessions.list({
      limit: 100,
      status: 'complete',
    });

    const oneTimeSponsorshipSessions = recentSessions.data.filter(s => 
      s.mode === 'payment' && s.metadata?.bestie_id && s.metadata?.frequency === 'one-time'
    );

    logStep("One-time sponsorship sessions found", { count: oneTimeSponsorshipSessions.length });

    // Check which one-time payments are missing from DB
    const existingPaymentIntentIds = new Set(
      (existingSponsorships || [])
        .filter(s => s.stripe_subscription_id?.startsWith('pi_'))
        .map(s => s.stripe_subscription_id)
    );

    for (const session of oneTimeSponsorshipSessions) {
      const paymentIntentId = session.payment_intent as string;
      const result: ReconcileResult = {
        action: 'skipped',
        stripeSubscriptionId: paymentIntentId,
        stripeCustomerId: session.customer as string,
        customerEmail: session.customer_details?.email || undefined,
        amount: session.metadata?.amount ? parseFloat(session.metadata.amount) : (session.amount_total || 0) / 100,
        frequency: 'one-time',
        bestieId: session.metadata?.bestie_id,
      };

      const sponsorBestie = sponsorBestieMap.get(session.metadata?.bestie_id);
      result.bestieName = sponsorBestie?.bestie_name || 'Unknown';

      if (existingPaymentIntentIds.has(paymentIntentId)) {
        result.action = 'already_exists';
      } else {
        // Also check by checkout session ID
        const existingBySession = (existingSponsorships || []).find(
          s => s.stripe_subscription_id === paymentIntentId
        );
        if (existingBySession) {
          result.action = 'already_exists';
          result.sponsorshipId = existingBySession.id;
        } else {
          result.action = 'found_missing';
          logStep(`🚨 MISSING one-time sponsorship for PI ${paymentIntentId}`, {
            email: result.customerEmail,
            bestieId: session.metadata?.bestie_id,
            amount: result.amount,
          });

          if (!dry_run) {
            let userId: string | null = null;
            if (result.customerEmail) {
              const { data: profile } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('email', result.customerEmail)
                .maybeSingle();
              userId = profile?.id || null;
            }

            const startedAt = new Date(session.created * 1000);
            const endedAt = new Date(startedAt);
            endedAt.setMonth(endedAt.getMonth() + 1);

            const { data: newSponsorship, error: insertError } = await supabaseClient
              .from('sponsorships')
              .insert({
                sponsor_id: userId,
                sponsor_email: userId ? null : result.customerEmail,
                sponsor_bestie_id: session.metadata?.bestie_id,
                bestie_id: sponsorBestie?.bestie_id || null,
                amount: result.amount,
                frequency: 'one-time',
                status: 'active',
                started_at: startedAt.toISOString(),
                ended_at: endedAt.toISOString(),
                stripe_subscription_id: paymentIntentId,
                stripe_customer_id: session.customer as string,
                stripe_checkout_session_id: session.id,
                stripe_mode: mode,
              })
              .select('id')
              .single();

            if (insertError) {
              result.action = 'error';
              result.error = insertError.message;
            } else {
              result.sponsorshipId = newSponsorship?.id;
              logStep(`✅ Created missing one-time sponsorship ${newSponsorship?.id}`);
            }
          }
        }
      }

      results.push(result);
    }

    // Summary
    const summary = {
      total_stripe_subscriptions: allSubscriptions.length,
      sponsorship_subscriptions: sponsorshipSubs.length,
      one_time_sessions_checked: oneTimeSponsorshipSessions.length,
      existing_db_records: existingSponsorships?.length || 0,
      already_exists: results.filter(r => r.action === 'already_exists').length,
      found_missing: results.filter(r => r.action === 'found_missing').length,
      errors: results.filter(r => r.action === 'error').length,
      skipped: results.filter(r => r.action === 'skipped').length,
      dry_run,
      mode,
    };

    logStep("Reconciliation complete", summary);

    // Return missing ones prominently
    const missingResults = results.filter(r => r.action === 'found_missing' || r.action === 'error');

    return new Response(
      JSON.stringify({ 
        summary,
        missing: missingResults,
        all_results: results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
