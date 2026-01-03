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

    // Check if this is a cron job call
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32)) {
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
    const stripeMode = modeData?.setting_value?.mode === "live" ? "live" : "test";
    
    const stripeKey = stripeMode === "live"
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
      const { data: customers } = await supabaseAdmin
        .from("donations")
        .select("donor_email")
        .not("donor_email", "is", null)
        .eq("stripe_mode", stripeMode);
      
      const { data: sponsorships } = await supabaseAdmin
        .from("sponsorships")
        .select("sponsor_email")
        .not("sponsor_email", "is", null)
        .eq("stripe_mode", stripeMode);

      const emailSet = new Set<string>();
      customers?.forEach(d => d.donor_email && emailSet.add(d.donor_email));
      sponsorships?.forEach(s => s.sponsor_email && emailSet.add(s.sponsor_email));
      emailsToSync = Array.from(emailSet);
      logStep("Cron syncing emails", { count: emailsToSync.length });
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

    let totalDonationsSynced = 0;
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
        const userId = profile?.id || null;

        // Fetch all invoices (subscription payments)
        const invoices = await stripe.invoices.list({
          customer: customer.id,
          status: "paid",
          limit: 100,
          expand: ["data.subscription"],
        });

        // Fetch all charges
        const charges = await stripe.charges.list({
          customer: customer.id,
          limit: 100,
        });

        // Build set of charge IDs that are linked to invoices
        const invoiceChargeIds = new Set<string>();
        invoices.data.forEach((inv: any) => {
          if (inv.charge && typeof inv.charge === "string") {
            invoiceChargeIds.add(inv.charge);
          }
          // Also check latest_charge for newer API versions
          if (inv.latest_charge && typeof inv.latest_charge === "string") {
            invoiceChargeIds.add(inv.latest_charge);
          }
        });

        // Process invoices -> monthly donations (subscriptions only)
        const donationRecords: any[] = [];
        
        for (const invoice of invoices.data) {
          if (!invoice.amount_paid || invoice.amount_paid <= 0) continue;
          
          // Get subscription ID
          let subscriptionId: string | null = null;
          if (invoice.subscription) {
            subscriptionId = typeof invoice.subscription === "string" 
              ? invoice.subscription 
              : invoice.subscription.id;
          }
          if (!subscriptionId && invoice.lines?.data?.[0]?.subscription) {
            subscriptionId = invoice.lines.data[0].subscription as string;
          }

          // SKIP store/marketplace purchases (they have order_id in metadata)
          const metadata = invoice.metadata || {};
          if (metadata.order_id) {
            logStep("Skipping marketplace invoice", { invoiceId: invoice.id, orderId: metadata.order_id });
            continue;
          }

          // Only include if it's a known sponsorship OR donation
          const isKnownSponsorship = subscriptionId && subscriptionToDesignation.has(subscriptionId);
          const isKnownDonation = metadata.type === "donation";
          const isFromKnownCustomer = customerToDesignation.has(customer.id);
          
          // Must be a donation or sponsorship - skip unknown charges
          if (!isKnownSponsorship && !isKnownDonation && !isFromKnownCustomer) {
            logStep("Skipping unknown invoice", { invoiceId: invoice.id });
            continue;
          }

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

          donationRecords.push({
            user_id: userId,
            user_email: email,
            stripe_invoice_id: invoice.id,
            stripe_charge_id: typeof invoice.charge === "string" ? invoice.charge : null,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customer.id,
            amount: invoice.amount_paid / 100,
            frequency: "monthly",
            status: "paid",
            designation,
            donation_date: new Date(invoice.created * 1000).toISOString(),
            receipt_url: invoice.hosted_invoice_url || null,
            stripe_mode: stripeMode,
            updated_at: new Date().toISOString(),
          });
        }

        // Process standalone charges (one-time donations/sponsorships only)
        for (const charge of charges.data) {
          // Skip if this charge is linked to an invoice
          if (invoiceChargeIds.has(charge.id)) continue;
          
          // Skip failed charges
          if (charge.status !== "succeeded") continue;
          if (!charge.amount || charge.amount <= 0) continue;

          const metadata = charge.metadata || {};
          
          // SKIP store/marketplace purchases (they have order_id in metadata)
          if (metadata.order_id) {
            logStep("Skipping marketplace charge", { chargeId: charge.id, orderId: metadata.order_id });
            continue;
          }

          // Only include if it's explicitly a donation or sponsorship
          const isSponsorship = metadata.bestie_id || metadata.bestieId || metadata.bestieName;
          const isDonation = metadata.type === "donation";
          
          // Must be a donation or sponsorship - skip unknown charges
          if (!isSponsorship && !isDonation) {
            logStep("Skipping unknown charge", { chargeId: charge.id, metadata });
            continue;
          }

          // Determine designation from metadata
          let designation = "General Support";
          if (isSponsorship) {
            designation = `Sponsorship: ${metadata.bestieName || "Unknown"}`;
          }

          donationRecords.push({
            user_id: userId,
            user_email: email,
            stripe_invoice_id: null,
            stripe_charge_id: charge.id,
            stripe_subscription_id: null,
            stripe_customer_id: customer.id,
            amount: charge.amount / 100,
            frequency: "one-time",
            status: "paid",
            designation,
            donation_date: new Date(charge.created * 1000).toISOString(),
            receipt_url: charge.receipt_url || null,
            stripe_mode: stripeMode,
            updated_at: new Date().toISOString(),
          });
        }

        // Upsert donations
        if (donationRecords.length > 0) {
          const { error: upsertError } = await supabaseAdmin
            .from("donation_history_cache")
            .upsert(donationRecords, {
              onConflict: "user_email,stripe_charge_id,stripe_invoice_id,stripe_mode",
              ignoreDuplicates: false,
            });
          if (upsertError) {
            logStep("Upsert donations error", { email, error: upsertError.message });
          } else {
            totalDonationsSynced += donationRecords.length;
          }
        }

        // Fetch and sync active subscriptions
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
            user_id: userId,
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
            donations_synced: donationRecords.length,
            subscriptions_synced: subscriptionRecords.length,
          }, {
            onConflict: "user_email,stripe_mode",
          });

        logStep("Synced user", { 
          email, 
          donations: donationRecords.length, 
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
      totalDonationsSynced,
      totalSubscriptionsSynced,
    });

    return new Response(JSON.stringify({
      success: true,
      emailsProcessed: emailsToSync.length,
      donationsSynced: totalDonationsSynced,
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
