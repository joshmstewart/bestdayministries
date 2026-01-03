import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DonationRecord {
  id: string;
  amount: number;
  frequency: "one-time" | "monthly";
  status: string;
  created_at: string;
  designation: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  stripe_payment_intent_id?: string;
  invoice_id?: string;
  receipt_url?: string;
}

const readId = (val: any): string | undefined => {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && typeof val.id === "string") return val.id;
  return undefined;
};

const readSponsorBestieIdFromMeta = (meta: any): string | undefined => {
  if (!meta || typeof meta !== "object") return undefined;
  const direct = meta.bestie_id ?? meta.sponsor_bestie_id ?? meta.bestieId ?? meta.sponsorBestieId;
  return typeof direct === "string" ? direct : undefined;
};

const isDonationMeta = (meta: any): boolean => {
  if (!meta || typeof meta !== "object") return false;
  return meta.type === "donation" || meta.donation_type === "general";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[GET-DONATION-HISTORY] Starting...");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[GET-DONATION-HISTORY] User:", user.email);

    // Get Stripe mode from app settings
    const { data: settingsData } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "stripe_mode")
      .maybeSingle();

    const rawStripeMode: any = settingsData?.setting_value;
    const stripeMode =
      rawStripeMode === "test" || rawStripeMode === "live"
        ? rawStripeMode
        : rawStripeMode?.mode === "test" || rawStripeMode?.mode === "live"
          ? rawStripeMode.mode
          : "live";

    const stripeKey =
      stripeMode === "live" ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    if (!stripeKey) throw new Error(`Stripe ${stripeMode} key not configured`);

    console.log("[GET-DONATION-HISTORY] Using Stripe mode:", stripeMode);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      console.log("[GET-DONATION-HISTORY] No Stripe customer found");
      return new Response(JSON.stringify({ donations: [], subscriptions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    console.log("[GET-DONATION-HISTORY] Found customer:", customerId);

    // Fetch Stripe data
    const [charges, subscriptions, invoices] = await Promise.all([
      stripe.charges.list({ customer: customerId, limit: 100 }),
      stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 }),
      stripe.invoices.list({ customer: customerId, limit: 100 }),
    ]);

    console.log("[GET-DONATION-HISTORY] Found:", {
      charges: charges.data.length,
      subscriptions: subscriptions.data.length,
      invoices: invoices.data.length,
    });

    // --- Sponsorship lookup (DB supplement) ---
    const sponsorshipByStripeRefId = new Map<string, string>();
    const sponsorBestieIds = new Set<string>();

    try {
      const { data: sponsorshipRows, error: sponsorshipErr } = await supabaseAdmin
        .from("sponsorships")
        .select("sponsor_bestie_id, stripe_subscription_id, stripe_payment_intent_id, frequency")
        .or(`sponsor_id.eq.${user.id},sponsor_email.eq.${user.email}`);

      if (sponsorshipErr) {
        console.log("[GET-DONATION-HISTORY] Sponsorship lookup error (non-fatal):", sponsorshipErr.message);
      }

      (sponsorshipRows || []).forEach((row: any) => {
        if (row?.sponsor_bestie_id) sponsorBestieIds.add(row.sponsor_bestie_id);
        if (row?.stripe_subscription_id) sponsorshipByStripeRefId.set(row.stripe_subscription_id, row.sponsor_bestie_id);
        if (row?.stripe_payment_intent_id)
          sponsorshipByStripeRefId.set(row.stripe_payment_intent_id, row.sponsor_bestie_id);
      });

      console.log("[GET-DONATION-HISTORY] Loaded sponsorship mappings:", {
        sponsorshipRows: (sponsorshipRows || []).length,
        stripeRefs: sponsorshipByStripeRefId.size,
      });
    } catch (e) {
      console.log("[GET-DONATION-HISTORY] Sponsorship lookup failed (non-fatal)");
    }

    // Also add any sponsor_bestie ids from Stripe metadata
    for (const sub of subscriptions.data) {
      const id = readSponsorBestieIdFromMeta((sub as any)?.metadata);
      if (id) sponsorBestieIds.add(id);
    }
    for (const ch of charges.data) {
      const id = readSponsorBestieIdFromMeta((ch as any)?.metadata);
      if (id) sponsorBestieIds.add(id);
    }

    // Build sponsor_bestie_id → bestie_name map
    const sponsorBestieNameMap: Record<string, string> = {};
    if (sponsorBestieIds.size > 0) {
      const { data: sponsorBesties, error: sponsorBestiesErr } = await supabaseAdmin
        .from("sponsor_besties")
        .select("id, bestie_name")
        .in("id", Array.from(sponsorBestieIds));

      if (sponsorBestiesErr) {
        console.log("[GET-DONATION-HISTORY] sponsor_besties lookup error (non-fatal):", sponsorBestiesErr.message);
      }

      (sponsorBesties || []).forEach((sb: any) => {
        sponsorBestieNameMap[sb.id] = sb.bestie_name;
      });

      console.log("[GET-DONATION-HISTORY] Loaded sponsor bestie names:", sponsorBestieNameMap);
    }

    const donations: DonationRecord[] = [];

    // Build helper maps
    const subscriptionItemToSubscriptionId = new Map<string, string>();
    const subscriptionsById = new Map<string, Stripe.Subscription>();
    for (const s of subscriptions.data) {
      subscriptionsById.set(s.id, s);
      for (const item of (s.items?.data || [])) {
        if (item?.id) subscriptionItemToSubscriptionId.set(item.id, s.id);
      }
    }

    // =====================================================
    // KEY FIX: Build set of charge IDs referenced by invoices
    // This is the canonical de-duplication approach
    // =====================================================
    const invoiceChargeIds = new Set<string>();
    
    for (const invoice of invoices.data) {
      const invAny = invoice as any;
      // invoice.charge is the primary link to the charge
      const chargeId = readId(invAny.charge);
      if (chargeId) invoiceChargeIds.add(chargeId);
      // Some versions use latest_charge
      const latestChargeId = readId(invAny.latest_charge);
      if (latestChargeId) invoiceChargeIds.add(latestChargeId);
    }

    console.log("[GET-DONATION-HISTORY] Invoice-linked charge IDs:", invoiceChargeIds.size);

    let invoicesProcessed = 0;
    let chargesProcessed = 0;
    let invoiceBackedChargesSkipped = 0;

    // Process invoices (subscription payments)
    for (const invoice of invoices.data) {
      if (invoice.status !== "paid") continue;

      if (!invoice.created || typeof invoice.created !== "number") continue;

      const invAny = invoice as any;

      // Resolve subscription ID
      let subscriptionId: string | undefined = readId(invAny.subscription);

      if (!subscriptionId && invAny.lines?.data?.length) {
        for (const line of invAny.lines.data) {
          const lineSubId = readId(line?.subscription);
          if (lineSubId) {
            subscriptionId = lineSubId;
            break;
          }
          const subItemId = typeof line?.subscription_item === "string" ? line.subscription_item : undefined;
          if (subItemId && subscriptionItemToSubscriptionId.has(subItemId)) {
            subscriptionId = subscriptionItemToSubscriptionId.get(subItemId);
            break;
          }
        }
      }

      // Only process invoices that are subscription-based
      const billingReason = typeof invAny.billing_reason === "string" ? invAny.billing_reason : "";
      const isSubscriptionInvoice = Boolean(subscriptionId) || billingReason.startsWith("subscription");
      
      if (!isSubscriptionInvoice) continue;

      const invPaymentIntentId = readId(invAny.payment_intent);

      // Resolve designation
      let designation = "General Support";
      const sponsorBestieFromDb =
        (subscriptionId ? sponsorshipByStripeRefId.get(subscriptionId) : undefined) ||
        (invPaymentIntentId ? sponsorshipByStripeRefId.get(invPaymentIntentId) : undefined);

      if (sponsorBestieFromDb) {
        designation = sponsorBestieNameMap[sponsorBestieFromDb] || "Sponsorship";
      } else if (subscriptionId) {
        const sub = subscriptionsById.get(subscriptionId);
        const subMeta: any = (sub as any)?.metadata || {};

        if (isDonationMeta(subMeta)) {
          designation = "General Support";
        } else {
          const sponsorBestieId = readSponsorBestieIdFromMeta(subMeta);
          if (sponsorBestieId && sponsorBestieNameMap[sponsorBestieId]) {
            designation = sponsorBestieNameMap[sponsorBestieId];
          } else if (sponsorBestieId) {
            designation = "Sponsorship";
          }
        }
      }

      donations.push({
        id: invoice.id,
        amount: (invoice.amount_paid || 0) / 100,
        frequency: "monthly", // All subscription invoices are monthly
        status: "completed",
        created_at: new Date(invoice.created * 1000).toISOString(),
        designation,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        invoice_id: invoice.id,
        receipt_url: invoice.hosted_invoice_url || undefined,
      });

      invoicesProcessed++;
    }

    // Process charges (one-time payments ONLY)
    for (const charge of charges.data) {
      if (charge.status !== "succeeded") continue;

      // =====================================================
      // KEY FIX: Skip if this charge is linked to any invoice
      // =====================================================
      if (invoiceChargeIds.has(charge.id)) {
        invoiceBackedChargesSkipped++;
        continue;
      }

      if (!charge.created || typeof charge.created !== "number") continue;

      const paymentIntentId = readId((charge as any).payment_intent);

      let meta: Record<string, any> = ((charge as any).metadata || {}) as any;
      if ((!readSponsorBestieIdFromMeta(meta) && !meta.type) && paymentIntentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          meta = (pi?.metadata || {}) as any;
        } catch {
          // Non-fatal
        }
      }

      let designation = "General Support";

      const sponsorBestieFromDb = paymentIntentId ? sponsorshipByStripeRefId.get(paymentIntentId) : undefined;
      if (sponsorBestieFromDb) {
        designation = sponsorBestieNameMap[sponsorBestieFromDb] || "Sponsorship";
      } else if (isDonationMeta(meta)) {
        designation = "General Support";
      } else {
        const sponsorBestieId = readSponsorBestieIdFromMeta(meta);
        if (sponsorBestieId && sponsorBestieNameMap[sponsorBestieId]) {
          designation = sponsorBestieNameMap[sponsorBestieId];
        } else if (sponsorBestieId) {
          designation = "Sponsorship";
        } else {
          const desc = ((charge as any).description || "").toString().toLowerCase();
          if (desc.includes("bestie sponsorship")) designation = "Sponsorship";
        }
      }

      donations.push({
        id: charge.id,
        amount: charge.amount / 100,
        frequency: "one-time",
        status: "completed",
        created_at: new Date(charge.created * 1000).toISOString(),
        designation,
        stripe_customer_id: customerId,
        stripe_payment_intent_id: paymentIntentId,
        receipt_url: charge.receipt_url || undefined,
      });

      chargesProcessed++;
    }

    // Sort by date descending
    donations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Get active subscriptions summary
    const activeSubscriptions = subscriptions.data
      .filter((s: Stripe.Subscription) => s.status === "active")
      .map((s: Stripe.Subscription) => {
        const periodEnd =
          s.current_period_end && typeof s.current_period_end === "number"
            ? new Date(s.current_period_end * 1000).toISOString()
            : null;

        const sponsorBestieFromDb = sponsorshipByStripeRefId.get(s.id);
        const sponsorBestieFromMeta = readSponsorBestieIdFromMeta((s as any).metadata);
        const sponsorBestieId = sponsorBestieFromDb || sponsorBestieFromMeta;

        let designation = "General Support";
        if (sponsorBestieId && sponsorBestieNameMap[sponsorBestieId]) {
          designation = sponsorBestieNameMap[sponsorBestieId];
        } else if (sponsorBestieId) {
          designation = "Sponsorship";
        }

        return {
          id: s.id,
          amount: s.items.data[0]?.price?.unit_amount ? s.items.data[0].price.unit_amount / 100 : 0,
          designation,
          status: s.status,
          current_period_end: periodEnd,
          cancel_at_period_end: s.cancel_at_period_end,
        };
      });

    console.log("[GET-DONATION-HISTORY] Returning", donations.length, "donations", {
      invoicesProcessed,
      chargesProcessed,
      invoiceBackedChargesSkipped,
      invoiceChargeIdsCount: invoiceChargeIds.size,
    });

    return new Response(
      JSON.stringify({
        donations,
        subscriptions: activeSubscriptions,
        stripe_mode: stripeMode,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GET-DONATION-HISTORY] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
