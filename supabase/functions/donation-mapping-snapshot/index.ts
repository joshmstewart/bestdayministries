import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const readId = (val: any): string | undefined => {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && typeof val.id === "string") return val.id;
  return undefined;
};

const toUnix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

async function listAll<T>(
  fn: (params: any) => Promise<{ data: T[]; has_more: boolean }>,
  params: Record<string, any>
): Promise<T[]> {
  const out: T[] = [];
  let starting_after: string | undefined = undefined;
  for (let i = 0; i < 50; i++) {
    const resp = await fn({ ...params, limit: 100, ...(starting_after ? { starting_after } : {}) });
    out.push(...(resp.data || []));
    if (!resp.has_more || resp.data.length === 0) break;
    const last: any = resp.data[resp.data.length - 1];
    starting_after = last?.id;
    if (!starting_after) break;
  }
  return out;
}

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

    const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleRow?.role !== "admin" && roleRow?.role !== "owner") {
      throw new Error("Only admins/owners can access this tool");
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").toString().trim();
    const date = (body.date || "").toString().trim(); // YYYY-MM-DD
    const stripeMode = body.stripe_mode === "live" ? "live" : "test";
    const timezone = (body.timezone || "America/Phoenix").toString().trim();

    if (!email) throw new Error("email is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must be YYYY-MM-DD");

    // Convert date to ISO range at 00:00-24:00 in chosen timezone
    const fakeStart = new Date(`${date}T00:00:00`);
    const formatInTz = (d: Date, tz: string) => {
      return new Date(d.toLocaleString("en-US", { timeZone: tz }));
    };
    // Get offset in milliseconds between UTC and chosen timezone for that day
    const tzStartLocal = new Date(fakeStart.toLocaleString("en-US", { timeZone: timezone }));
    const tzStartUtc = new Date(fakeStart.toLocaleString("en-US", { timeZone: "UTC" }));
    const offsetMs = tzStartUtc.getTime() - tzStartLocal.getTime();

    const startIso = new Date(fakeStart.getTime() + offsetMs).toISOString();
    const endIso = new Date(fakeStart.getTime() + offsetMs + 24 * 60 * 60 * 1000).toISOString();

    const stripeKey = stripeMode === "live" ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    if (!stripeKey) throw new Error(`Stripe ${stripeMode} key not configured`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Stripe customers (can be >1 per email)
    const customers = await stripe.customers.list({ email, limit: 100 });
    const customerIds = customers.data.map((c: any) => c.id);

    // If Stripe has no customer for the email, still return DB-only snapshot
    const created = { gte: toUnix(startIso), lt: toUnix(endIso) };

    const stripeItems: any[] = [];

    const perCustomer = await Promise.all(
      customerIds.map(async (customer: string) => {
        const [charges, invoices, sessions, paymentIntents, subscriptions] = await Promise.all([
          listAll((p) => stripe.charges.list(p) as any, { customer, created }),
          listAll((p) => stripe.invoices.list(p) as any, { customer, created }),
          listAll((p) => stripe.checkout.sessions.list(p) as any, { customer, created }),
          listAll((p) => stripe.paymentIntents.list(p) as any, { customer, created }),
          listAll((p) => stripe.subscriptions.list(p) as any, { customer, status: "all", created }),
        ]);

        return { customer, charges, invoices, sessions, paymentIntents, subscriptions };
      })
    );

    for (const block of perCustomer) {
      const cid = block.customer;

      for (const ch of block.charges) {
        const piId = readId((ch as any).payment_intent);
        const meta = (ch as any).metadata || {};
        stripeItems.push({
          type: "charge",
          id: (ch as any).id,
          created: (ch as any).created ? new Date(((ch as any).created as number) * 1000).toISOString() : undefined,
          amount: typeof (ch as any).amount === "number" ? (ch as any).amount / 100 : undefined,
          currency: (ch as any).currency,
          status: (ch as any).status,
          customer_id: cid,
          payment_intent_id: piId,
          invoice_id: readId((ch as any).invoice),
          order_id: (meta as any).order_id,
          metadata: meta,
          raw: ch,
        });
      }

      for (const inv of block.invoices) {
        const invAny = inv as any;
        const meta = invAny.metadata || {};
        stripeItems.push({
          type: "invoice",
          id: invAny.id,
          created: invAny.created ? new Date((invAny.created as number) * 1000).toISOString() : undefined,
          amount: typeof invAny.amount_paid === "number" ? invAny.amount_paid / 100 : undefined,
          currency: invAny.currency,
          status: invAny.status,
          customer_id: cid,
          payment_intent_id: readId(invAny.payment_intent),
          subscription_id: readId(invAny.subscription),
          order_id: (meta as any).order_id,
          metadata: meta,
          raw: inv,
        });
      }

      for (const s of block.sessions) {
        const sess: any = s;
        const meta = sess.metadata || {};
        stripeItems.push({
          type: "checkout_session",
          id: sess.id,
          created: sess.created ? new Date((sess.created as number) * 1000).toISOString() : undefined,
          amount: typeof sess.amount_total === "number" ? sess.amount_total / 100 : undefined,
          currency: sess.currency,
          status: sess.status,
          customer_id: cid,
          payment_intent_id: readId(sess.payment_intent),
          subscription_id: readId(sess.subscription),
          order_id: (meta as any).order_id,
          metadata: meta,
          raw: s,
        });
      }

      for (const pi of block.paymentIntents) {
        const piAny: any = pi;
        const meta = piAny.metadata || {};
        stripeItems.push({
          type: "payment_intent",
          id: piAny.id,
          created: piAny.created ? new Date((piAny.created as number) * 1000).toISOString() : undefined,
          amount: typeof piAny.amount === "number" ? piAny.amount / 100 : undefined,
          currency: piAny.currency,
          status: piAny.status,
          customer_id: cid,
          payment_intent_id: piAny.id,
          order_id: (meta as any).order_id,
          metadata: meta,
          raw: pi,
        });
      }

      for (const sub of block.subscriptions) {
        const subAny: any = sub;
        const meta = subAny.metadata || {};
        stripeItems.push({
          type: "subscription",
          id: subAny.id,
          created: subAny.created ? new Date((subAny.created as number) * 1000).toISOString() : undefined,
          amount: undefined,
          status: subAny.status,
          customer_id: cid,
          subscription_id: subAny.id,
          order_id: (meta as any).order_id,
          metadata: meta,
          raw: sub,
        });
      }
    }

    // ---- DB side (ALL records for that date + email + linked user IDs) ----
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").eq("email", email);
    const profileIds = (profiles || []).map((p: any) => p.id);

    const start = startIso;
    const end = endIso;

    const donationsByEmail = await supabaseAdmin
      .from("donations")
      .select("*")
      .eq("donor_email", email)
      .gte("created_at", start)
      .lt("created_at", end);

    const donationsById = profileIds.length
      ? await supabaseAdmin
          .from("donations")
          .select("*")
          .in("donor_id", profileIds)
          .gte("created_at", start)
          .lt("created_at", end)
      : { data: [] as any[] };

    const sponsorshipsByEmail = await supabaseAdmin
      .from("sponsorships")
      .select("*")
      .eq("sponsor_email", email)
      .gte("created_at", start)
      .lt("created_at", end);

    const sponsorshipsById = profileIds.length
      ? await supabaseAdmin
          .from("sponsorships")
          .select("*")
          .in("sponsor_id", profileIds)
          .gte("created_at", start)
          .lt("created_at", end)
      : { data: [] as any[] };

    const receiptsByEmail = await supabaseAdmin
      .from("sponsorship_receipts")
      .select("*")
      .eq("sponsor_email", email)
      .gte("transaction_date", start)
      .lt("transaction_date", end);

    const receiptsById = profileIds.length
      ? await supabaseAdmin
          .from("sponsorship_receipts")
          .select("*")
          .in("user_id", profileIds)
          .gte("transaction_date", start)
          .lt("transaction_date", end)
      : { data: [] as any[] };

    const ordersByEmail = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("customer_email", email)
      .gte("created_at", start)
      .lt("created_at", end);

    const ordersByUser = profileIds.length
      ? await supabaseAdmin
          .from("orders")
          .select("*")
          .or(
            [
              `user_id.in.(${profileIds.join(",")})`,
              `customer_id.in.(${profileIds.join(",")})`,
              `customer_email.eq.${email}`,
            ].join(",")
          )
          .gte("created_at", start)
          .lt("created_at", end)
      : { data: [] as any[] };

    const ordersMerged = [...(ordersByEmail.data || []), ...(ordersByUser.data || [])];
    const orderIdSet = new Set(ordersMerged.map((o: any) => o.id));
    const orderIds = Array.from(orderIdSet);

    const orderItems = orderIds.length
      ? await supabaseAdmin.from("order_items").select("*").in("order_id", orderIds)
      : { data: [] as any[] };

    const donationHistoryCache = await supabaseAdmin
      .from("donation_history_cache")
      .select("*")
      .eq("user_email", email)
      .gte("donation_date", start)
      .lt("donation_date", end);

    const activeSubscriptionsCache = await supabaseAdmin
      .from("active_subscriptions_cache")
      .select("*")
      .eq("user_email", email);

    const uniqById = (rows: any[]) => {
      const m = new Map<string, any>();
      for (const r of rows) {
        const id = r?.id ? String(r.id) : crypto.randomUUID();
        if (!m.has(id)) m.set(id, r);
      }
      return Array.from(m.values());
    };

    const donations = uniqById([...(donationsByEmail.data || []), ...(donationsById.data || [])]);
    const sponsorships = uniqById([...(sponsorshipsByEmail.data || []), ...(sponsorshipsById.data || [])]);
    const receipts = uniqById([...(receiptsByEmail.data || []), ...(receiptsById.data || [])]);
    const orders = uniqById(ordersMerged);

    // ---- Lightweight auto-linking (for human inspection) ----
    const byPaymentIntentId: Record<string, string[]> = {};
    const byOrderId: Record<string, string[]> = {};

    for (const it of stripeItems) {
      const key = `${it.type}:${it.id}`;
      const pi = it.payment_intent_id;
      const orderId = it.order_id;
      if (pi) byPaymentIntentId[pi] = [...(byPaymentIntentId[pi] || []), key];
      if (orderId) byOrderId[orderId] = [...(byOrderId[orderId] || []), key];
    }

    return new Response(
      JSON.stringify({
        email,
        stripeMode,
        date,
        window: { start: startIso, end: endIso },
        customerIds,
        stripe: { items: stripeItems },
        database: {
          profiles: profiles || [],
          donations,
          sponsorships,
          receipts,
          orders,
          orderItems: orderItems.data || [],
          donationHistoryCache: donationHistoryCache.data || [],
          activeSubscriptionsCache: activeSubscriptionsCache.data || [],
        },
        links: { byPaymentIntentId, byOrderId },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[DONATION-MAPPING-SNAPSHOT] Error:", error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
