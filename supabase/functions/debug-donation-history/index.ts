import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DebugItem {
  stripeId: string;
  type: "charge" | "invoice" | "subscription";
  rawStripeData: any;
  relatedData: {
    checkoutSession?: any;
    subscription?: any;
    paymentIntent?: any;
    invoice?: any;
  };
  metadata: {
    fromCharge?: any;
    fromInvoice?: any;
    fromSubscription?: any;
    fromCheckoutSession?: any;
    merged?: any;
  };
  databaseMatches: {
    sponsorship?: any;
    donation?: any;
    sponsorBestie?: any;
  };
  mappingResult: {
    isMarketplace: boolean;
    marketplaceReason?: string;
    isInvoiceBacked: boolean;
    designation: string;
    designationReason: string;
    finalOutput: any;
  };
}

const readId = (val: any): string | undefined => {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && typeof val.id === "string") return val.id;
  return undefined;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    // Check admin/owner role
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleRow?.role !== "admin" && roleRow?.role !== "owner") {
      throw new Error("Only admins/owners can access this debugger");
    }

    const body = await req.json().catch(() => ({}));
    const email = body.email;
    const stripeMode = body.stripe_mode === "live" ? "live" : "test";
    const limit = body.limit || 5;

    if (!email) throw new Error("Email is required");

    const stripeKey =
      stripeMode === "live" ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    if (!stripeKey) throw new Error(`Stripe ${stripeMode} key not configured`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find ALL customers (Stripe can create multiple customers for the same email)
    const customers = await stripe.customers.list({ email, limit: 100 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ error: "No Stripe customer found for this email", items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerIds = customers.data.map((c: any) => c.id);
    const customerId = customerIds[0];

    // Fetch all related Stripe data across ALL customers
    const perCustomer = await Promise.all(
      customerIds.map(async (cid: string) => {
        const [charges, subscriptions, invoices, checkoutSessions] = await Promise.all([
          stripe.charges.list({ customer: cid, limit: 100 }),
          stripe.subscriptions.list({ customer: cid, status: "all", limit: 100 }),
          stripe.invoices.list({ customer: cid, limit: 100 }),
          stripe.checkout.sessions.list({ customer: cid, limit: 100 }),
        ]);

        return {
          cid,
          charges: charges.data.map((x: any) => ({ ...x, __customerId: cid })),
          subscriptions: subscriptions.data.map((x: any) => ({ ...x, __customerId: cid })),
          invoices: invoices.data.map((x: any) => ({ ...x, __customerId: cid })),
          checkoutSessions: checkoutSessions.data.map((x: any) => ({ ...x, __customerId: cid })),
        };
      })
    );

    const allCharges = perCustomer.flatMap((p: any) => p.charges);
    const allSubscriptions = perCustomer.flatMap((p: any) => p.subscriptions);
    const allInvoices = perCustomer.flatMap((p: any) => p.invoices);
    const allCheckoutSessions = perCustomer.flatMap((p: any) => p.checkoutSessions);

    // Keep existing code below mostly unchanged by mimicking Stripe list responses
    const charges = { data: allCharges } as any;
    const subscriptions = { data: allSubscriptions } as any;
    const invoices = { data: allInvoices } as any;
    const checkoutSessions = { data: allCheckoutSessions } as any;

    // Build lookup maps
    const sessionByPaymentIntent = new Map<string, any>();
    const sessionBySubscription = new Map<string, any>();
    for (const s of checkoutSessions.data) {
      const piId = readId((s as any).payment_intent);
      if (piId) sessionByPaymentIntent.set(piId, s);
      const subId = readId((s as any).subscription);
      if (subId) sessionBySubscription.set(subId, s);
    }

    const subscriptionById = new Map<string, any>();
    for (const sub of subscriptions.data) {
      subscriptionById.set(sub.id, sub);
    }

    const invoiceById = new Map<string, any>();
    const invoiceChargeIds = new Set<string>();
    const paymentIntentToCharges = new Map<string, string[]>();

    for (const ch of charges.data) {
      const piId = readId((ch as any).payment_intent);
      if (piId) {
        const arr = paymentIntentToCharges.get(piId) || [];
        arr.push(ch.id);
        paymentIntentToCharges.set(piId, arr);
      }
    }

    for (const inv of invoices.data) {
      invoiceById.set(inv.id, inv);
      const chargeId = readId((inv as any).charge);
      if (chargeId) invoiceChargeIds.add(chargeId);
      const latestChargeId = readId((inv as any).latest_charge);
      if (latestChargeId) invoiceChargeIds.add(latestChargeId);
      const piId = readId((inv as any).payment_intent);
      if (piId && paymentIntentToCharges.has(piId)) {
        for (const cid of paymentIntentToCharges.get(piId) || []) invoiceChargeIds.add(cid);
      }
    }

    // DB lookups (by email OR by linked user id)
    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const profileId = profileRow?.id as string | undefined;

    const sponsorshipQuery = supabaseAdmin.from("sponsorships").select("*");
    const donationQuery = supabaseAdmin.from("donations").select("*");

    const { data: sponsorshipRows } = profileId
      ? await sponsorshipQuery.or(`sponsor_email.eq.${email},sponsor_id.eq.${profileId}`)
      : await sponsorshipQuery.eq("sponsor_email", email);

    const { data: donationRows } = profileId
      ? await donationQuery.or(`donor_email.eq.${email},donor_id.eq.${profileId}`)
      : await donationQuery.eq("donor_email", email);

    const sponsorBestieIds = new Set<string>();
    (sponsorshipRows || []).forEach((r: any) => {
      if (r.sponsor_bestie_id) sponsorBestieIds.add(r.sponsor_bestie_id);
    });

    const { data: sponsorBesties } = await supabaseAdmin
      .from("sponsor_besties")
      .select("id, bestie_name")
      .in("id", Array.from(sponsorBestieIds).length ? Array.from(sponsorBestieIds) : ["no-match"]);

    const sponsorBestieNameMap: Record<string, string> = {};
    (sponsorBesties || []).forEach((sb: any) => {
      sponsorBestieNameMap[sb.id] = sb.bestie_name;
    });

    const sponsorshipByStripeRef = new Map<string, any>();
    (sponsorshipRows || []).forEach((r: any) => {
      if (r.stripe_subscription_id) sponsorshipByStripeRef.set(r.stripe_subscription_id, r);
      if (r.stripe_payment_intent_id) sponsorshipByStripeRef.set(r.stripe_payment_intent_id, r);
    });

    const donationByStripeRef = new Map<string, any>();
    (donationRows || []).forEach((r: any) => {
      if (r.stripe_subscription_id) donationByStripeRef.set(r.stripe_subscription_id, r);
      if (r.stripe_payment_intent_id) donationByStripeRef.set(r.stripe_payment_intent_id, r);
      if (r.stripe_checkout_session_id) donationByStripeRef.set(r.stripe_checkout_session_id, r);
    });

    const items: DebugItem[] = [];

    // Debug ALL charges (not limited)
    for (const charge of charges.data) {
      const piId = readId((charge as any).payment_intent);
      const session = piId ? sessionByPaymentIntent.get(piId) : undefined;
      
      const chargeMeta = (charge as any).metadata || {};
      const sessionMeta = session?.metadata || {};
      const mergedMeta = { ...chargeMeta, ...sessionMeta };

      const isInvoiceBacked = invoiceChargeIds.has(charge.id);
      const isMarketplace = Boolean(mergedMeta.order_id);

      // Find DB matches
      const sponsorship = piId ? sponsorshipByStripeRef.get(piId) : undefined;
      const donation = piId ? donationByStripeRef.get(piId) : undefined;

      // Determine designation
      let designation = "General Support";
      let designationReason = "Default - no matching metadata or DB records";

      if (isMarketplace) {
        designation = "SKIPPED (Marketplace)";
        designationReason = `order_id found in metadata: ${mergedMeta.order_id}`;
      } else if (sponsorship) {
        const bestieName = sponsorBestieNameMap[sponsorship.sponsor_bestie_id];
        designation = bestieName ? `Sponsorship: ${bestieName}` : "Sponsorship";
        designationReason = `Matched sponsorship record in DB (sponsor_bestie_id: ${sponsorship.sponsor_bestie_id})`;
      } else if (mergedMeta.type === "donation" || mergedMeta.donation_type === "general") {
        designation = "General Support";
        designationReason = "Metadata indicates donation type";
      } else if (mergedMeta.bestie_id || mergedMeta.sponsor_bestie_id || mergedMeta.bestieId) {
        const bestieId = mergedMeta.bestie_id || mergedMeta.sponsor_bestie_id || mergedMeta.bestieId;
        const bestieName = sponsorBestieNameMap[bestieId];
        designation = bestieName ? `Sponsorship: ${bestieName}` : "Sponsorship";
        designationReason = `bestie_id found in metadata: ${bestieId}`;
      }

      items.push({
        stripeId: charge.id,
        type: "charge",
        rawStripeData: {
          id: charge.id,
          amount: charge.amount / 100,
          status: charge.status,
          created: new Date((charge.created || 0) * 1000).toISOString(),
          payment_intent: piId,
          invoice: (charge as any).invoice,
          description: (charge as any).description,
        },
        relatedData: {
          checkoutSession: session ? { id: session.id, mode: session.mode } : undefined,
        },
        metadata: {
          fromCharge: chargeMeta,
          fromCheckoutSession: sessionMeta,
          merged: mergedMeta,
        },
        databaseMatches: {
          sponsorship: sponsorship || undefined,
          donation: donation || undefined,
          sponsorBestie: sponsorship?.sponsor_bestie_id
            ? { id: sponsorship.sponsor_bestie_id, name: sponsorBestieNameMap[sponsorship.sponsor_bestie_id] }
            : undefined,
        },
        mappingResult: {
          isMarketplace,
          marketplaceReason: isMarketplace ? `order_id: ${mergedMeta.order_id}` : undefined,
          isInvoiceBacked,
          designation,
          designationReason,
          finalOutput: isInvoiceBacked
            ? { status: "SKIPPED", reason: "Charge is invoice-backed, will be processed via invoice" }
            : isMarketplace
              ? { status: "SKIPPED", reason: "Marketplace purchase" }
              : {
                  status: "INCLUDED",
                  as: {
                    id: charge.id,
                    amount: charge.amount / 100,
                    frequency: "one-time",
                    designation,
                  },
                },
        },
      });
    }

    // Debug ALL paid invoices (not limited)
    for (const invoice of invoices.data.filter((i: any) => i.status === "paid")) {
      const invAny = invoice as any;
      const subId = readId(invAny.subscription);
      const piId = readId(invAny.payment_intent);
      const sub = subId ? subscriptionById.get(subId) : undefined;
      const session = subId ? sessionBySubscription.get(subId) : piId ? sessionByPaymentIntent.get(piId) : undefined;

      const invMeta = invAny.metadata || {};
      const subMeta = sub?.metadata || {};
      const sessionMeta = session?.metadata || {};
      const mergedMeta = { ...invMeta, ...subMeta, ...sessionMeta };

      const isMarketplace = Boolean(mergedMeta.order_id);

      const sponsorship = (subId ? sponsorshipByStripeRef.get(subId) : undefined) ||
        (piId ? sponsorshipByStripeRef.get(piId) : undefined);

      let designation = "General Support";
      let designationReason = "Default - no matching metadata or DB records";

      if (isMarketplace) {
        designation = "SKIPPED (Marketplace)";
        designationReason = `order_id found in metadata: ${mergedMeta.order_id}`;
      } else if (sponsorship) {
        const bestieName = sponsorBestieNameMap[sponsorship.sponsor_bestie_id];
        designation = bestieName ? `Sponsorship: ${bestieName}` : "Sponsorship";
        designationReason = `Matched sponsorship record in DB (sponsor_bestie_id: ${sponsorship.sponsor_bestie_id})`;
      } else if (mergedMeta.type === "donation" || mergedMeta.donation_type === "general") {
        designation = "General Support";
        designationReason = "Metadata indicates donation type";
      } else if (mergedMeta.bestie_id || mergedMeta.sponsor_bestie_id || mergedMeta.bestieId) {
        const bestieId = mergedMeta.bestie_id || mergedMeta.sponsor_bestie_id || mergedMeta.bestieId;
        const bestieName = sponsorBestieNameMap[bestieId];
        designation = bestieName ? `Sponsorship: ${bestieName}` : "Sponsorship";
        designationReason = `bestie_id found in metadata: ${bestieId}`;
      }

      items.push({
        stripeId: invoice.id,
        type: "invoice",
        rawStripeData: {
          id: invoice.id,
          amount_paid: (invoice.amount_paid || 0) / 100,
          status: invoice.status,
          created: new Date((invoice.created || 0) * 1000).toISOString(),
          subscription: subId,
          payment_intent: piId,
          billing_reason: invAny.billing_reason,
        },
        relatedData: {
          subscription: sub ? { id: sub.id, status: sub.status } : undefined,
          checkoutSession: session ? { id: session.id, mode: session.mode } : undefined,
        },
        metadata: {
          fromInvoice: invMeta,
          fromSubscription: subMeta,
          fromCheckoutSession: sessionMeta,
          merged: mergedMeta,
        },
        databaseMatches: {
          sponsorship: sponsorship || undefined,
          sponsorBestie: sponsorship?.sponsor_bestie_id
            ? { id: sponsorship.sponsor_bestie_id, name: sponsorBestieNameMap[sponsorship.sponsor_bestie_id] }
            : undefined,
        },
        mappingResult: {
          isMarketplace,
          marketplaceReason: isMarketplace ? `order_id: ${mergedMeta.order_id}` : undefined,
          isInvoiceBacked: true,
          designation,
          designationReason,
          finalOutput: isMarketplace
            ? { status: "SKIPPED", reason: "Marketplace purchase" }
            : {
                status: "INCLUDED",
                as: {
                  id: invoice.id,
                  amount: (invoice.amount_paid || 0) / 100,
                  frequency: "monthly",
                  designation,
                },
              },
        },
      });
    }

    return new Response(
       JSON.stringify({
         email,
         stripeMode,
         customerId,
         customerIds,
         summary: {
           totalCharges: charges.data.length,
           totalInvoices: invoices.data.length,
           totalSubscriptions: subscriptions.data.length,
           totalCheckoutSessions: checkoutSessions.data.length,
           invoiceLinkedCharges: invoiceChargeIds.size,
           dbSponsorships: (sponsorshipRows || []).length,
           dbDonations: (donationRows || []).length,
         },
         items,
       }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[DEBUG-DONATION-HISTORY] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
