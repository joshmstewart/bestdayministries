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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[GET-DONATION-HISTORY] Starting...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    console.log("[GET-DONATION-HISTORY] User:", user.email);

    // Get Stripe mode from app settings
    const { data: settingsData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "stripe_mode")
      .maybeSingle();

    const stripeMode = settingsData?.setting_value?.mode || "live";
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");

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

    // Fetch all charges (one-time payments)
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    });

    // Fetch all subscriptions (recurring)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    // Fetch all invoices (for recurring payment history)
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    console.log("[GET-DONATION-HISTORY] Found:", {
      charges: charges.data.length,
      subscriptions: subscriptions.data.length,
      invoices: invoices.data.length,
    });

    const donations: DonationRecord[] = [];

    // Log subscription metadata for debugging
    for (const sub of subscriptions.data) {
      console.log("[GET-DONATION-HISTORY] Subscription metadata:", sub.id, JSON.stringify(sub.metadata));
    }

    // Create a map of bestie_id to bestie_name from sponsor_besties table
    const bestieIds = new Set<string>();
    for (const sub of subscriptions.data) {
      if (sub.metadata?.bestie_id) {
        bestieIds.add(sub.metadata.bestie_id);
      }
    }
    for (const charge of charges.data) {
      if (charge.metadata?.bestie_id) {
        bestieIds.add(charge.metadata.bestie_id);
      }
    }
    
    const bestieNameMap: Record<string, string> = {};
    if (bestieIds.size > 0) {
      const { data: sponsorBesties } = await supabaseClient
        .from('sponsor_besties')
        .select('id, bestie_name')
        .in('id', Array.from(bestieIds));
      
      if (sponsorBesties) {
        for (const sb of sponsorBesties) {
          bestieNameMap[sb.id] = sb.bestie_name;
        }
      }
      console.log("[GET-DONATION-HISTORY] Loaded bestie names:", bestieNameMap);
    }

    // Build helper maps for invoice → subscription resolution and de-duping
    const subscriptionItemToSubscriptionId = new Map<string, string>();
    for (const s of subscriptions.data) {
      for (const item of (s.items?.data || [])) {
        if (item?.id) subscriptionItemToSubscriptionId.set(item.id, s.id);
      }
    }

    const invoicePaymentIntentIds = new Set<string>();
    for (const inv of invoices.data) {
      const pi = (inv as any)?.payment_intent;
      if (typeof pi === "string") invoicePaymentIntentIds.add(pi);
    }

    // Process invoices (recurring payments) - these are the actual payment records
    for (const invoice of invoices.data) {
      if (invoice.status !== "paid") continue;
      
      // Skip if no valid timestamp
      if (!invoice.created || typeof invoice.created !== 'number') {
        console.log("[GET-DONATION-HISTORY] Skipping invoice with invalid created timestamp:", invoice.id);
        continue;
      }
      
      // Resolve subscription ID (Stripe can return these in a few places depending on invoice type)
      let designation = "General Support";
      let subscriptionId: string | undefined;
      let frequency: "one-time" | "monthly" = "one-time";

      const invAny = invoice as any;

      const readId = (val: any): string | undefined => {
        if (!val) return undefined;
        if (typeof val === "string") return val;
        if (typeof val === "object" && val !== null && typeof val.id === "string") return val.id;
        return undefined;
      };

      subscriptionId = readId(invAny.subscription);

      // Fallback: some invoices expose the subscription via line items
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

      // Determine designation/frequency using subscription metadata when possible
      if (subscriptionId) {
        frequency = "monthly";
        const sub = subscriptions.data.find((s: Stripe.Subscription) => s.id === subscriptionId);
        const meta: Record<string, any> = ((sub as any)?.metadata || {}) as any;
        const bestieId = meta.bestie_id;

        if (meta.type === "donation" || meta.donation_type === "general") {
          designation = "General Support";
        } else if (bestieId && bestieNameMap[bestieId]) {
          designation = bestieNameMap[bestieId];
        } else if (bestieId) {
          designation = "Sponsorship";
        }
      } else {
        // Fallback: classification sometimes lives on the PaymentIntent
        let meta: Record<string, any> = (invAny.metadata || {}) as any;
        if ((!meta.bestie_id && !meta.type) && typeof invAny.payment_intent === "string") {
          try {
            const pi = await stripe.paymentIntents.retrieve(invAny.payment_intent);
            meta = (pi?.metadata || {}) as any;
          } catch {
            console.log("[GET-DONATION-HISTORY] Failed to retrieve payment intent for invoice:", invoice.id);
          }
        }

        if (meta.frequency === "monthly") frequency = "monthly";

        if (meta.type === "donation" || meta.donation_type === "general") {
          designation = "General Support";
        } else if (meta.bestie_id && bestieNameMap[meta.bestie_id]) {
          designation = bestieNameMap[meta.bestie_id];
        } else if (meta.bestie_id) {
          designation = "Sponsorship";
        }
      }

      try {
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
      } catch (e) {
        console.error("[GET-DONATION-HISTORY] Error processing invoice:", invoice.id, e);
      }
    }

    // Process one-time charges that aren't part of subscriptions/invoices
    for (const charge of charges.data) {
      if (charge.status !== "succeeded") continue;
      // If this charge is tied to an invoice, we already include the invoice record (prevents duplicates)
      if ((charge as any).invoice) continue;

      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : undefined;
      // De-dupe: subscription payments often show up as both invoice + charge
      if (paymentIntentId && invoicePaymentIntentIds.has(paymentIntentId)) continue;

      // Skip if no valid timestamp
      if (!charge.created || typeof charge.created !== 'number') {
        console.log("[GET-DONATION-HISTORY] Skipping charge with invalid created timestamp:", charge.id);
        continue;
      }

      let meta: Record<string, any> = (charge.metadata || {}) as any;
      if ((!meta.bestie_id && !meta.type) && paymentIntentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          meta = (pi?.metadata || {}) as any;
        } catch {
          console.log("[GET-DONATION-HISTORY] Failed to retrieve payment intent for charge:", charge.id);
        }
      }

      let designation = "General Support";
      if (meta.type === "donation" || meta.donation_type === "general") {
        designation = "General Support";
      } else if (meta.bestie_id && bestieNameMap[meta.bestie_id]) {
        designation = bestieNameMap[meta.bestie_id];
      } else if (meta.bestie_id) {
        designation = "Sponsorship";
      }

      try {
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
      } catch (e) {
        console.error("[GET-DONATION-HISTORY] Error processing charge:", charge.id, e);
      }
    }

    // Sort by date descending
    donations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Get active subscriptions summary
    const activeSubscriptions = subscriptions.data
      .filter((s: Stripe.Subscription) => s.status === "active")
      .map((s: Stripe.Subscription) => {
        const periodEnd = s.current_period_end && typeof s.current_period_end === 'number' 
          ? new Date(s.current_period_end * 1000).toISOString() 
          : null;
        const bestieId = s.metadata?.bestie_id;
        let designation = "General Support";
        if (bestieId && bestieNameMap[bestieId]) {
          designation = bestieNameMap[bestieId];
        } else if (bestieId) {
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

    console.log("[GET-DONATION-HISTORY] Returning", donations.length, "donations");

    return new Response(JSON.stringify({ 
      donations, 
      subscriptions: activeSubscriptions,
      stripe_mode: stripeMode,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GET-DONATION-HISTORY] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
