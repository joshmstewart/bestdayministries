import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE-DONATIONS] ${step}${detailsStr}`);
};

interface ReconcileResult {
  donationId: string;
  oldStatus: string;
  newStatus: string;
  stripeObjectId: string | null;
  stripeStatus: string | null;
  action: 'activated' | 'completed' | 'cancelled' | 'auto_cancelled' | 'skipped' | 'error';
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

    // Allow EITHER cron secret header OR admin user auth
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET') || 'reconcile-donations-secret-2024';
    
    const isCronCall = cronSecret === expectedCronSecret;

    if (isCronCall) {
      logStep("Authenticated via cron secret header");
    } else {
      // Validate admin user if not a cron call
      if (!authHeader) throw new Error('No authorization header');
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !user) throw new Error('Authentication failed');

      // Verify admin access
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner']);

      if (!roles || roles.length === 0) {
        throw new Error('Unauthorized: Admin access required');
      }

      logStep("Admin authenticated", { userId: user.id });
    }

    // Parse request body for optional filters
    const body = await req.json().catch(() => ({}));
    const { mode, since, limit = 500 } = body;

    logStep("Parameters", { mode, since, limit });

    // Query pending donations
    let query = supabaseClient
      .from('donations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (mode) {
      query = query.eq('stripe_mode', mode);
    }

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data: pendingDonations, error: donationsError } = await query;

    if (donationsError) throw donationsError;

    logStep("Found pending donations", { count: pendingDonations?.length || 0 });

    const results: ReconcileResult[] = [];
    const donationsToGenerateReceipts: string[] = [];

    // Initialize Stripe clients
    const stripeTest = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_TEST') || '', { 
      apiVersion: "2025-08-27.basil" 
    });
    const stripeLive = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_LIVE') || '', { 
      apiVersion: "2025-08-27.basil" 
    });

    // Process each pending donation
    for (const donation of pendingDonations || []) {
      const stripe = donation.stripe_mode === 'live' ? stripeLive : stripeTest;
      const result: ReconcileResult = {
        donationId: donation.id,
        oldStatus: donation.status,
        newStatus: donation.status,
        stripeObjectId: null,
        stripeStatus: null,
        action: 'skipped'
      };

      try {
        logStep(`Processing donation ${donation.id}`, { 
          frequency: donation.frequency,
          amount: donation.amount,
          created: donation.created_at 
        });

        // Skip very recent donations (< 5 minutes) to allow webhooks to process
        const createdAt = new Date(donation.created_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (createdAt > fiveMinutesAgo) {
          result.action = 'skipped';
          result.newStatus = 'pending';
          logStep(`Skipping recent donation ${donation.id}`);
          results.push(result);
          continue;
        }

        // Strategy 1: Try checkout session ID (preferred)
        if (donation.stripe_checkout_session_id) {
          try {
            const session = await stripe.checkout.sessions.retrieve(
              donation.stripe_checkout_session_id,
              { expand: ['subscription', 'payment_intent'] }
            );

            result.stripeObjectId = session.id;
            result.stripeStatus = session.status;

            if (session.mode === 'subscription' && session.subscription) {
              const subscription = session.subscription as Stripe.Subscription;
              
              if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
                // Update to active
                const { error: updateError } = await supabaseClient
                  .from('donations')
                  .update({
                    status: 'active',
                    stripe_subscription_id: subscription.id,
                    stripe_customer_id: session.customer as string,
                    amount_charged: donation.amount,
                    started_at: new Date(subscription.created * 1000).toISOString()
                  })
                  .eq('id', donation.id);

                if (updateError) throw updateError;

                result.newStatus = 'active';
                result.action = 'activated';
                donationsToGenerateReceipts.push(donation.id);
                logStep(`✅ Activated monthly donation ${donation.id}`);
              } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
                // Mark as cancelled
                const { error: updateError } = await supabaseClient
                  .from('donations')
                  .update({ status: 'cancelled' })
                  .eq('id', donation.id);

                if (updateError) throw updateError;

                result.newStatus = 'cancelled';
                result.action = 'cancelled';
                logStep(`❌ Cancelled donation ${donation.id} - subscription ${subscription.status}`);
              }
            } else if (session.mode === 'payment' && session.payment_intent) {
              const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
              
              if (paymentIntent.status === 'succeeded') {
                // Update to completed
                const { error: updateError } = await supabaseClient
                  .from('donations')
                  .update({
                    status: 'completed',
                    stripe_payment_intent_id: paymentIntent.id,
                    stripe_customer_id: session.customer as string,
                    amount_charged: paymentIntent.amount / 100,
                    started_at: new Date(paymentIntent.created * 1000).toISOString()
                  })
                  .eq('id', donation.id);

                if (updateError) throw updateError;

                result.newStatus = 'completed';
                result.action = 'completed';
                donationsToGenerateReceipts.push(donation.id);
                logStep(`✅ Completed one-time donation ${donation.id}`);
              }
            } else if (session.status === 'expired') {
              // Session expired, cancel donation
              const { error: updateError } = await supabaseClient
                .from('donations')
                .update({ status: 'cancelled' })
                .eq('id', donation.id);

              if (updateError) throw updateError;

              result.newStatus = 'cancelled';
              result.action = 'cancelled';
              logStep(`❌ Cancelled donation ${donation.id} - session expired`);
            }
          } catch (sessionError: any) {
            logStep(`Session lookup failed for ${donation.id}`, { error: sessionError.message });
            // Continue to fallback strategies
          }
        }

        // Strategy 2: Try subscription ID for monthly donations
        if (result.action === 'skipped' && donation.frequency === 'monthly' && donation.stripe_subscription_id) {
          try {
            const subscription = await stripe.subscriptions.retrieve(donation.stripe_subscription_id);
            
            result.stripeObjectId = subscription.id;
            result.stripeStatus = subscription.status;

            if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
              const { error: updateError } = await supabaseClient
                .from('donations')
                .update({
                  status: 'active',
                  stripe_customer_id: subscription.customer as string,
                  amount_charged: donation.amount,
                  started_at: new Date(subscription.created * 1000).toISOString()
                })
                .eq('id', donation.id);

              if (updateError) throw updateError;

              result.newStatus = 'active';
              result.action = 'activated';
              donationsToGenerateReceipts.push(donation.id);
              logStep(`✅ Activated monthly donation ${donation.id} via subscription`);
            } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
              const { error: updateError } = await supabaseClient
                .from('donations')
                .update({ status: 'cancelled' })
                .eq('id', donation.id);

              if (updateError) throw updateError;

              result.newStatus = 'cancelled';
              result.action = 'cancelled';
              logStep(`❌ Cancelled donation ${donation.id} - subscription ${subscription.status}`);
            }
          } catch (subError: any) {
            logStep(`Subscription lookup failed for ${donation.id}`, { error: subError.message });
          }
        }

        // Strategy 3: Fallback - search by customer + amount + date window
        if (result.action === 'skipped' && donation.stripe_customer_id && donation.amount) {
          try {
            const createdWindow = new Date(donation.created_at);
            const startTime = Math.floor((createdWindow.getTime() - 60 * 60 * 1000) / 1000); // 1 hour before
            const endTime = Math.floor((createdWindow.getTime() + 60 * 60 * 1000) / 1000); // 1 hour after

            if (donation.frequency === 'monthly') {
              // Search for subscriptions
              const subscriptions = await stripe.subscriptions.list({
                customer: donation.stripe_customer_id,
                created: { gte: startTime, lte: endTime },
                limit: 10
              });

              const matchingSub = subscriptions.data.find((sub: Stripe.Subscription) => {
                // First try matching on metadata.amount if available
                if (sub.metadata?.amount) {
                  const metadataAmount = parseFloat(sub.metadata.amount);
                  if (Math.abs(metadataAmount - donation.amount) < 0.01) {
                    return true;
                  }
                }
                // Fall back to price comparison with lenient threshold for fee coverage
                const subAmount = sub.items.data[0]?.price?.unit_amount || 0;
                return Math.abs((subAmount / 100) - donation.amount) < 1.00; // Allow up to $1 difference for fees
              });

              if (matchingSub && ['active', 'trialing', 'past_due'].includes(matchingSub.status)) {
                const { error: updateError } = await supabaseClient
                  .from('donations')
                  .update({
                    status: 'active',
                    stripe_subscription_id: matchingSub.id,
                    amount_charged: donation.amount,
                    started_at: new Date(matchingSub.created * 1000).toISOString()
                  })
                  .eq('id', donation.id);

                if (updateError) throw updateError;

                result.newStatus = 'active';
                result.action = 'activated';
                result.stripeObjectId = matchingSub.id;
                result.stripeStatus = matchingSub.status;
                donationsToGenerateReceipts.push(donation.id);
                logStep(`✅ Activated monthly donation ${donation.id} via customer search`);
              }
            } else {
              // Search for payment intents
              const paymentIntents = await stripe.paymentIntents.list({
                customer: donation.stripe_customer_id,
                created: { gte: startTime, lte: endTime },
                limit: 10
              });

              const matchingPI = paymentIntents.data.find((pi: Stripe.PaymentIntent) => {
                if (pi.status !== 'succeeded') return false;
                // First try matching on metadata.amount if available
                if (pi.metadata?.amount) {
                  const metadataAmount = parseFloat(pi.metadata.amount);
                  if (Math.abs(metadataAmount - donation.amount) < 0.01) {
                    return true;
                  }
                }
                // Fall back to amount comparison with lenient threshold for fee coverage
                return Math.abs((pi.amount / 100) - donation.amount) < 1.00; // Allow up to $1 difference for fees
              });

              if (matchingPI) {
                const { error: updateError } = await supabaseClient
                  .from('donations')
                  .update({
                    status: 'completed',
                    stripe_payment_intent_id: matchingPI.id,
                    amount_charged: matchingPI.amount / 100,
                    started_at: new Date(matchingPI.created * 1000).toISOString()
                  })
                  .eq('id', donation.id);

                if (updateError) throw updateError;

                result.newStatus = 'completed';
                result.action = 'completed';
                result.stripeObjectId = matchingPI.id;
                result.stripeStatus = matchingPI.status;
                donationsToGenerateReceipts.push(donation.id);
                logStep(`✅ Completed one-time donation ${donation.id} via customer search`);
              }
            }
          } catch (searchError: any) {
            logStep(`Customer search failed for ${donation.id}`, { error: searchError.message });
          }
        }

        // Auto-cancel stale pending donations with no Stripe record after 2 hours
        if (result.action === 'skipped') {
          const donationAge = Date.now() - new Date(donation.created_at).getTime();
          const twoHours = 2 * 60 * 60 * 1000;
          
          if (donationAge > twoHours) {
            // No Stripe record found after 2 hours = abandoned checkout
            const { error: cancelError } = await supabaseClient
              .from('donations')
              .update({ 
                status: 'cancelled',
                updated_at: new Date().toISOString()
              })
              .eq('id', donation.id);

            if (!cancelError) {
              result.newStatus = 'cancelled';
              result.action = 'auto_cancelled';
              logStep(`🗑️ Auto-cancelled donation ${donation.id} - no Stripe record after 2h (abandoned checkout)`);
            } else {
              logStep(`Failed to auto-cancel donation ${donation.id}`, { error: cancelError.message });
            }
          }
        }

      } catch (error: any) {
        result.action = 'error';
        result.error = error.message;
        logStep(`Error processing donation ${donation.id}`, { error: error.message });
      }

      results.push(result);
    }

    // Generate receipts and send emails for newly activated/completed donations
    logStep("Generating receipts and sending emails", { count: donationsToGenerateReceipts.length });
    
    let receiptsSent = 0;
    let receiptErrors = 0;
    
    if (donationsToGenerateReceipts.length > 0) {
      // First, generate receipt records via RPC
      const { data: receiptsData, error: receiptsError } = await supabaseClient.rpc(
        'generate_missing_receipts'
      );

      if (receiptsError) {
        logStep("Error generating receipts", { error: receiptsError.message });
      } else {
        logStep("Receipts generated", { count: receiptsData?.length || 0 });
      }
      
      // Now send receipt emails for each donation that was just updated
      for (const donationId of donationsToGenerateReceipts) {
        try {
          // Get the donation details to send the receipt
          const { data: donation, error: donationError } = await supabaseClient
            .from('donations')
            .select('id, donor_email, donor_id, amount, amount_charged, frequency, created_at, stripe_mode')
            .eq('id', donationId)
            .single();
          
          if (donationError || !donation) {
            logStep(`Could not fetch donation ${donationId} for receipt email`, { error: donationError?.message });
            receiptErrors++;
            continue;
          }
          
          // Resolve donor email for signed-in donors (donor_email is null due to donor_identifier_check)
          let resolvedEmail: string | null = donation.donor_email || null;
          let sponsorName = 'Donor';
          if (donation.donor_id) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('display_name, email')
              .eq('id', donation.donor_id)
              .single();
            if (profile?.email) resolvedEmail = resolvedEmail || profile.email;
            if (profile?.display_name) sponsorName = profile.display_name;
          }

          // Skip if still no email available
          if (!resolvedEmail) {
            logStep(`Skipping receipt email for ${donationId} - no email available (guest + no email)`);
            continue;
          }
          
          // Invoke send-sponsorship-receipt to send the email
          const { error: sendError } = await supabaseClient.functions.invoke('send-sponsorship-receipt', {
            body: {
              sponsorEmail: resolvedEmail,
              sponsorName: sponsorName,
              bestieName: 'General Support',
              amount: donation.amount_charged || donation.amount,
              frequency: donation.frequency,
              transactionId: `donation_${donation.id}`,
              transactionDate: donation.created_at,
              stripeMode: donation.stripe_mode
            }
          });
          
          if (sendError) {
            logStep(`Error sending receipt email for donation ${donationId}`, { error: sendError.message });
            receiptErrors++;
          } else {
            logStep(`✉️ Sent receipt email to ${resolvedEmail}`);
            receiptsSent++;
          }
        } catch (emailError: any) {
          logStep(`Exception sending receipt for ${donationId}`, { error: emailError.message });
          receiptErrors++;
        }
      }
      
      logStep("Receipt emails complete", { sent: receiptsSent, errors: receiptErrors });
    }

    // Calculate summary
    const summary = {
      total: results.length,
      activated: results.filter(r => r.action === 'activated').length,
      completed: results.filter(r => r.action === 'completed').length,
      cancelled: results.filter(r => r.action === 'cancelled').length,
      skipped: results.filter(r => r.action === 'skipped').length,
      errors: results.filter(r => r.action === 'error').length,
      receiptsSent,
      receiptErrors
    };

    logStep("Reconciliation complete", summary);

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message, stack: error.stack });
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
