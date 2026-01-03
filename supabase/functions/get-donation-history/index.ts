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

    // Get Stripe mode from app settings (supports both legacy string and object shapes)
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
    // Stripe metadata is not always present on Charge/Invoice, but our DB has a reliable mapping.
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

    // Also add any sponsor_bestie ids we can see directly in Stripe metadata
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

    // Build helper maps for invoice → subscription resolution and de-duping
    const subscriptionItemToSubscriptionId = new Map<string, string>();
    const subscriptionsById = new Map<string, Stripe.Subscription>();
    for (const s of subscriptions.data) {
      subscriptionsById.set(s.id, s);
      for (const item of (s.items?.data || [])) {
        if (item?.id) subscriptionItemToSubscriptionId.set(item.id, s.id);
      }
    }

    // Only de-dupe against *recurring* invoices.
    const recurringInvoiceIds = new Set<string>();
    const recurringInvoicePaymentIntentIds = new Set<string>();

    let recurringInvoicesIncluded = 0;
    let nonRecurringInvoicesSkipped = 0;
    let invoiceBackedChargesSkipped = 0;

    // Process invoices (recurring payments)
    for (const invoice of invoices.data) {
      if (invoice.status !== "paid") continue;

      if (!invoice.created || typeof invoice.created !== "number") {
        console.log("[GET-DONATION-HISTORY] Skipping invoice with invalid created timestamp:", invoice.id);
        continue;
      }

      const invAny = invoice as any;
      const billingReason = typeof invAny.billing_reason === "string" ? invAny.billing_reason : "";

      // Resolve subscription ID (Stripe can return these in a few places)
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

      const isRecurring = Boolean(subscriptionId) || Boolean(readId(invAny.subscription)) || billingReason.startsWith("subscription");
      if (!isRecurring) {
        nonRecurringInvoicesSkipped++;
        continue;
      }

      recurringInvoiceIds.add(invoice.id);
      const invPaymentIntentId = readId(invAny.payment_intent);
      if (invPaymentIntentId) recurringInvoicePaymentIntentIds.add(invPaymentIntentId);

      // Default: recurring invoices are monthly
      let frequency: "one-time" | "monthly" = "monthly";

      // Resolve designation in priority order:
      // 1) DB sponsorship mapping by subscription/payment_intent
      // 2) Stripe subscription metadata (bestie_id)
      // 3) Stripe invoice/payment_intent metadata
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
      } else {
        // Fallback: classification sometimes lives on the PaymentIntent
        let meta: Record<string, any> = (invAny.metadata || {}) as any;
        if ((!readSponsorBestieIdFromMeta(meta) && !meta.type) && typeof invAny.payment_intent === "string") {
          try {
            const pi = await stripe.paymentIntents.retrieve(invAny.payment_intent);
            meta = (pi?.metadata || {}) as any;
          } catch {
            console.log("[GET-DONATION-HISTORY] Failed to retrieve payment intent for invoice:", invoice.id);
          }
        }

        if (meta.frequency === "one-time") frequency = "one-time";

        if (isDonationMeta(meta)) {
          designation = "General Support";
        } else {
          const sponsorBestieId = readSponsorBestieIdFromMeta(meta);
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
        frequency,
        status: "completed",
        created_at: new Date(invoice.created * 1000).toISOString(),
        designation,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        invoice_id: invoice.id,
        receipt_url: invoice.hosted_invoice_url || undefined,
      });

      recurringInvoicesIncluded++;
    }

    // Process one-time charges (and non-recurring invoice payments)
    for (const charge of charges.data) {
      if (charge.status !== "succeeded") continue;

      const paymentIntentId = readId((charge as any).payment_intent);

      // De-dupe: recurring invoice payments show up as both an invoice + a charge.
      const chargeInvoiceId = readId((charge as any).invoice);
      if (
        (paymentIntentId && recurringInvoicePaymentIntentIds.has(paymentIntentId)) ||
        (chargeInvoiceId && recurringInvoiceIds.has(chargeInvoiceId))
      ) {
        invoiceBackedChargesSkipped++;
        continue;
      }

      if (!charge.created || typeof charge.created !== "number") {
        console.log("[GET-DONATION-HISTORY] Skipping charge with invalid created timestamp:", charge.id);
        continue;
      }

      let meta: Record<string, any> = ((charge as any).metadata || {}) as any;
      if ((!readSponsorBestieIdFromMeta(meta) && !meta.type) && paymentIntentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          meta = (pi?.metadata || {}) as any;
        } catch {
          console.log("[GET-DONATION-HISTORY] Failed to retrieve payment intent for charge:", charge.id);
        }
      }

      let designation = "General Support";

      // DB sponsorship mapping is the most reliable for one-time sponsorships
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

        // Prefer DB mapping, then Stripe metadata
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
      recurringInvoicesIncluded,
      nonRecurringInvoicesSkipped,
      invoiceBackedChargesSkipped,
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
