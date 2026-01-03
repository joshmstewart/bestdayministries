import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${step}`, details ? JSON.stringify(details, null, 2) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header (for manual sync) or process all users (for cron)
    const authHeader = req.headers.get("Authorization");
    let targetEmail: string | null = null;
    let isCronJob = false;

    // Check if this is a cron job call (using schedule header or service role key prefix)
    const cronSecret = req.headers.get("x-cron-secret");
    const isScheduledCall = req.headers.get("x-schedule") !== null;
    
    if (isScheduledCall || cronSecret === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32)) {
      isCronJob = true;
      logStep("Cron job triggered");
    } else if (authHeader) {
      // Manual sync for specific user
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData.user?.email) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetEmail = userData.user.email;
      logStep("Manual sync for user", { email: targetEmail });
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Stripe mode
    const { data: modeData } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "stripe_mode")
      .maybeSingle();

    const rawStripeMode: any = modeData?.setting_value;
    const stripeMode =
      rawStripeMode === "test" || rawStripeMode === "live"
        ? rawStripeMode
        : rawStripeMode?.mode === "test" || rawStripeMode?.mode === "live"
          ? rawStripeMode.mode
          : "live";

    const stripeKey =
      stripeMode === "live"
        ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY")
        : Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get emails to sync
    let emailsToSync: string[] = [];
    if (targetEmail) {
      emailsToSync = [targetEmail];
    } else if (isCronJob) {
      // For cron: get all users who have made donations or have active subscriptions
      const { data: donationEmails } = await supabaseAdmin
        .from("donations")
        .select("donor_email")
        .not("donor_email", "is", null)
        .eq("stripe_mode", stripeMode);
      
      const { data: sponsorshipEmails } = await supabaseAdmin
        .from("sponsorships")
        .select("sponsor_email")
        .not("sponsor_email", "is", null)
        .eq("stripe_mode", stripeMode);

      // Also get emails from existing cache to ensure we sync returning users
      const { data: cachedEmails } = await supabaseAdmin
        .from("donation_stripe_transactions")
        .select("email")
        .eq("stripe_mode", stripeMode);

      const emailSet = new Set<string>();
      donationEmails?.forEach(d => d.donor_email && emailSet.add(d.donor_email));
      sponsorshipEmails?.forEach(s => s.sponsor_email && emailSet.add(s.sponsor_email));
      cachedEmails?.forEach(c => c.email && emailSet.add(c.email));
      
      emailsToSync = Array.from(emailSet);
      logStep("Cron syncing emails", { count: emailsToSync.length, mode: stripeMode });
    }

    // Load sponsorship mappings for designation lookup
    const { data: sponsorshipsData } = await supabaseAdmin
      .from("sponsorships")
      .select(`
        id,
        stripe_subscription_id,
        stripe_customer_id,
        sponsor_bestie_id,
        sponsor_besties!inner(bestie_name)
      `)
      .eq("stripe_mode", stripeMode);

    const subscriptionToDesignation = new Map<string, string>();
    const customerToDesignation = new Map<string, string>();
    sponsorshipsData?.forEach((s: any) => {
      const bestieName = s.sponsor_besties?.bestie_name;
      if (bestieName) {
        if (s.stripe_subscription_id) {
          subscriptionToDesignation.set(s.stripe_subscription_id, `Sponsorship: ${bestieName}`);
        }
        if (s.stripe_customer_id) {
          customerToDesignation.set(s.stripe_customer_id, `Sponsorship: ${bestieName}`);
        }
      }
    });

    // Load existing donation records for linking
    const { data: existingDonations } = await supabaseAdmin
      .from("donations")
      .select("id, stripe_payment_intent_id, stripe_subscription_id, stripe_customer_id, donor_email, amount, stripe_mode")
      .eq("stripe_mode", stripeMode);

    const donationLookup = new Map<string, string>();
    existingDonations?.forEach(d => {
      if (d.stripe_payment_intent_id) donationLookup.set(d.stripe_payment_intent_id, d.id);
      // Also index by customer + amount for fallback matching
      if (d.stripe_customer_id && d.amount) {
        donationLookup.set(`${d.stripe_customer_id}_${d.amount}`, d.id);
      }
    });

    // Load existing receipts for linking
    const { data: existingReceipts } = await supabaseAdmin
      .from("sponsorship_receipts")
      .select("id, transaction_id, stripe_mode")
      .eq("stripe_mode", stripeMode);

    const receiptLookup = new Map<string, string>();
    existingReceipts?.forEach(r => {
      if (r.transaction_id) receiptLookup.set(r.transaction_id, r.id);
    });

    let totalTransactionsSynced = 0;
    let totalSubscriptionsSynced = 0;

    for (const email of emailsToSync) {
      try {
        // Find Stripe customer
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (!customers.data.length) {
          logStep("No Stripe customer found", { email });
          continue;
        }
        const customer = customers.data[0];

        // Get user_id from profiles if exists
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        const donorId = profile?.id || null;

        // Fetch all invoices (subscription payments)
        const invoices = await stripe.invoices.list({
          customer: customer.id,
          status: "paid",
          limit: 100,
          expand: ["data.subscription", "data.payment_intent", "data.charge"],
        });

        // Fetch all charges
        const charges = await stripe.charges.list({
          customer: customer.id,
          limit: 100,
        });

        // Fetch payment intents for additional context
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customer.id,
          limit: 100,
        });

        // Build maps for combining data
        const chargeMap = new Map<string, any>();
        charges.data.forEach((c: any) => chargeMap.set(c.id, c));

        const paymentIntentMap = new Map<string, any>();
        paymentIntents.data.forEach((pi: any) => paymentIntentMap.set(pi.id, pi));

        // Build set of charge IDs that are linked to invoices (to avoid duplicates)
        const invoiceChargeIds = new Set<string>();
        const invoicePaymentIntentIds = new Set<string>();
        
        invoices.data.forEach((inv: any) => {
          if (inv.charge) {
            const chargeId = typeof inv.charge === "string" ? inv.charge : inv.charge?.id;
            if (chargeId) invoiceChargeIds.add(chargeId);
          }
          if (inv.payment_intent) {
            const piId = typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent?.id;
            if (piId) invoicePaymentIntentIds.add(piId);
          }
        });

        // Process invoices -> combined transaction records
        const transactionRecords: any[] = [];
        
        for (const invoice of invoices.data) {
          if (!invoice.amount_paid || invoice.amount_paid <= 0) continue;
          
          const metadata = invoice.metadata || {};
          
          // SKIP store/marketplace purchases
          if (metadata.order_id) {
            logStep("Skipping marketplace invoice", { invoiceId: invoice.id });
            continue;
          }

          // Get related objects
          const chargeId = typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id;
          const charge = chargeId ? chargeMap.get(chargeId) || invoice.charge : null;
          
          const piId = typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id;
          const paymentIntent = piId ? paymentIntentMap.get(piId) || invoice.payment_intent : null;

          // Get subscription ID
          let subscriptionId: string | null = null;
          if (invoice.subscription) {
            subscriptionId = typeof invoice.subscription === "string" 
              ? invoice.subscription 
              : invoice.subscription.id;
          }

          // Determine frequency
          const frequency = subscriptionId ? "monthly" : "one-time";

          // Determine designation
          let designation = "General Support";
          if (subscriptionId && subscriptionToDesignation.has(subscriptionId)) {
            designation = subscriptionToDesignation.get(subscriptionId)!;
          } else if (customerToDesignation.has(customer.id)) {
            designation = customerToDesignation.get(customer.id)!;
          }
          if (metadata.type === "donation") {
            designation = "General Support";
          }

          // Merge metadata from all sources
          const mergedMetadata = {
            ...(paymentIntent?.metadata || {}),
            ...(typeof charge === "object" ? charge?.metadata || {} : {}),
            ...(metadata || {}),
          };

          // Find linked donation record
          let donationId: string | null = null;
          if (piId && donationLookup.has(piId)) {
            donationId = donationLookup.get(piId)!;
          } else if (donationLookup.has(`${customer.id}_${invoice.amount_paid / 100}`)) {
            donationId = donationLookup.get(`${customer.id}_${invoice.amount_paid / 100}`)!;
          }

          // Find linked receipt
          let receiptId: string | null = null;
          if (invoice.id && receiptLookup.has(invoice.id)) {
            receiptId = receiptLookup.get(invoice.id)!;
          } else if (piId && receiptLookup.has(piId)) {
            receiptId = receiptLookup.get(piId)!;
          }

          transactionRecords.push({
            email,
            donor_id: donorId,
            donation_id: donationId,
            receipt_id: receiptId,
            stripe_invoice_id: invoice.id,
            stripe_charge_id: chargeId || null,
            stripe_payment_intent_id: piId || null,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customer.id,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency?.toUpperCase() || "USD",
            frequency,
            status: "paid",
            transaction_date: new Date(invoice.created * 1000).toISOString(),
            stripe_mode: stripeMode,
            raw_invoice: invoice,
            raw_charge: typeof charge === "object" ? charge : null,
            raw_payment_intent: typeof paymentIntent === "object" ? paymentIntent : null,
            merged_metadata: mergedMetadata,
          });
        }

        // Process standalone charges (not linked to invoices)
        for (const charge of charges.data) {
          if (invoiceChargeIds.has(charge.id)) continue;
          if (charge.status !== "succeeded") continue;
          if (!charge.amount || charge.amount <= 0) continue;

          const metadata = charge.metadata || {};
          
          // SKIP marketplace purchases
          if (metadata.order_id) {
            logStep("Skipping marketplace charge", { chargeId: charge.id });
            continue;
          }

          // Get payment intent if available
          const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
          const paymentIntent = piId ? paymentIntentMap.get(piId) : null;

          // Determine designation
          const isSponsorship = metadata.bestie_id || metadata.bestieId || metadata.bestieName;
          let designation = "General Support";
          if (isSponsorship) {
            designation = `Sponsorship: ${metadata.bestieName || "Unknown"}`;
          }

          // Merge metadata
          const mergedMetadata = {
            ...(paymentIntent?.metadata || {}),
            ...(metadata || {}),
          };

          // Find linked donation
          let donationId: string | null = null;
          if (piId && donationLookup.has(piId)) {
            donationId = donationLookup.get(piId)!;
          }

          // Find linked receipt
          let receiptId: string | null = null;
          if (charge.id && receiptLookup.has(charge.id)) {
            receiptId = receiptLookup.get(charge.id)!;
          } else if (piId && receiptLookup.has(piId)) {
            receiptId = receiptLookup.get(piId)!;
          }

          transactionRecords.push({
            email,
            donor_id: donorId,
            donation_id: donationId,
            receipt_id: receiptId,
            stripe_invoice_id: null,
            stripe_charge_id: charge.id,
            stripe_payment_intent_id: piId,
            stripe_subscription_id: null,
            stripe_customer_id: customer.id,
            amount: charge.amount / 100,
            currency: charge.currency?.toUpperCase() || "USD",
            frequency: "one-time",
            status: "paid",
            transaction_date: new Date(charge.created * 1000).toISOString(),
            stripe_mode: stripeMode,
            raw_invoice: null,
            raw_charge: charge,
            raw_payment_intent: paymentIntent,
            merged_metadata: mergedMetadata,
          });
        }

        // Upsert to donation_stripe_transactions (the COMBINED table)
        if (transactionRecords.length > 0) {
          for (const record of transactionRecords) {
            // Use a composite key for upsert - prefer invoice_id, then charge_id
            const { error: upsertError } = await supabaseAdmin
              .from("donation_stripe_transactions")
              .upsert(record, {
                onConflict: "stripe_invoice_id,stripe_mode",
                ignoreDuplicates: false,
              });
            
            // If invoice_id is null, try upserting by charge_id
            if (upsertError && !record.stripe_invoice_id && record.stripe_charge_id) {
              await supabaseAdmin
                .from("donation_stripe_transactions")
                .upsert(record, {
                  onConflict: "stripe_charge_id,stripe_mode",
                  ignoreDuplicates: false,
                });
            }
          }
          totalTransactionsSynced += transactionRecords.length;
        }

        // Fetch and sync active subscriptions to cache
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 100,
        });

        const subscriptionRecords: any[] = [];
        for (const sub of subscriptions.data) {
          let designation = "General Support";
          if (subscriptionToDesignation.has(sub.id)) {
            designation = subscriptionToDesignation.get(sub.id)!;
          } else if (customerToDesignation.has(customer.id)) {
            designation = customerToDesignation.get(customer.id)!;
          }

          const amount = sub.items.data[0]?.price?.unit_amount 
            ? sub.items.data[0].price.unit_amount / 100 
            : 0;

          subscriptionRecords.push({
            user_id: donorId,
            user_email: email,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customer.id,
            amount,
            designation,
            status: sub.status,
            current_period_end: sub.current_period_end 
              ? new Date(sub.current_period_end * 1000).toISOString() 
              : null,
            stripe_mode: stripeMode,
            updated_at: new Date().toISOString(),
          });
        }

        if (subscriptionRecords.length > 0) {
          const { error: subError } = await supabaseAdmin
            .from("active_subscriptions_cache")
            .upsert(subscriptionRecords, {
              onConflict: "user_email,stripe_subscription_id,stripe_mode",
              ignoreDuplicates: false,
            });
          if (subError) {
            logStep("Upsert subscriptions error", { email, error: subError.message });
          } else {
            totalSubscriptionsSynced += subscriptionRecords.length;
          }
        }

        // Update sync status
        await supabaseAdmin
          .from("donation_sync_status")
          .upsert({
            user_email: email,
            stripe_mode: stripeMode,
            last_synced_at: new Date().toISOString(),
            sync_status: "completed",
            donations_synced: transactionRecords.length,
            subscriptions_synced: subscriptionRecords.length,
          }, {
            onConflict: "user_email,stripe_mode",
          });

        logStep("Synced user", { 
          email, 
          transactions: transactionRecords.length, 
          subscriptions: subscriptionRecords.length 
        });

      } catch (userError: any) {
        logStep("Error syncing user", { email, error: userError.message });
        await supabaseAdmin
          .from("donation_sync_status")
          .upsert({
            user_email: email,
            stripe_mode: stripeMode,
            last_synced_at: new Date().toISOString(),
            sync_status: "error",
            error_message: userError.message,
          }, {
            onConflict: "user_email,stripe_mode",
          });
      }
    }

    logStep("Sync complete", { 
      emailsProcessed: emailsToSync.length,
      totalTransactionsSynced,
      totalSubscriptionsSynced,
    });

    return new Response(JSON.stringify({
      success: true,
      emailsProcessed: emailsToSync.length,
      transactionsSynced: totalTransactionsSynced,
      subscriptionsSynced: totalSubscriptionsSynced,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("Fatal error", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
