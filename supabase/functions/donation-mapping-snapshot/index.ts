import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

async function searchAll<T>(
  fn: (params: any) => Promise<{ data: T[]; has_more: boolean; next_page?: string }>,
  params: Record<string, any>
): Promise<T[]> {
  const out: T[] = [];
  let page: string | undefined = undefined;
  for (let i = 0; i < 50; i++) {
    const resp = await fn({ ...params, limit: 100, ...(page ? { page } : {}) });
    out.push(...(resp.data || []));
    if (!resp.has_more || resp.data.length === 0) break;
    page = (resp as any).next_page;
    if (!page) break;
  }
  return out;
}

const uniqByKey = <T>(items: T[], keyFn: (t: T) => string) => {
  const m = new Map<string, T>();
  for (const it of items) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, it);
  }
  return Array.from(m.values());
};

const safeStr = (v: any) => (v === null || v === undefined ? "" : String(v));

const normalizeEmail = (v: any) => safeStr(v).trim().toLowerCase();
const emailMatches = (candidate: any, targetNormalized: string) => normalizeEmail(candidate) === targetNormalized;

const escapeStripeQueryValue = (v: string) => v.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
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
    const emailInput = safeStr(body.email).trim();
    const email = emailInput.toLowerCase();
    const date = safeStr(body.date).trim(); // YYYY-MM-DD
    const stripeMode = body.stripe_mode === "live" ? "live" : "test";
    const timezone = safeStr(body.timezone || "America/Phoenix").trim();

    if (!email) throw new Error("email is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must be YYYY-MM-DD");

    console.log("[DONATION-MAPPING-SNAPSHOT] Request", { emailInput, emailNormalized: email, date, timezone, stripeMode });

    // Convert date to ISO range at 00:00-24:00 in chosen timezone
    const fakeStart = new Date(`${date}T00:00:00`);

    // Get offset in milliseconds between UTC and chosen timezone for that day.
    // We do this by formatting the same instant into the target TZ and UTC, then comparing.
    const tzStartLocal = new Date(fakeStart.toLocaleString("en-US", { timeZone: timezone }));
    const tzStartUtc = new Date(fakeStart.toLocaleString("en-US", { timeZone: "UTC" }));
    const offsetMs = tzStartUtc.getTime() - tzStartLocal.getTime();

    const startIso = new Date(fakeStart.getTime() + offsetMs).toISOString();
    const endIso = new Date(fakeStart.getTime() + offsetMs + 24 * 60 * 60 * 1000).toISOString();

    const startTs = toUnix(startIso);
    const endTs = toUnix(endIso);

    console.log("[DONATION-MAPPING-SNAPSHOT] Window", { startIso, endIso, startTs, endTs });

    const stripeKey = stripeMode === "live" ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    if (!stripeKey) throw new Error(`Stripe ${stripeMode} key not configured`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Stripe customers (can be >1 per email)
    const customerIds: string[] = [];
    const stripeCustomers: any[] = [];

    // Prefer Search API when available (more reliable than list-by-email in some cases)
    if ((stripe as any).customers?.search) {
      const q = `email:"${escapeStripeQueryValue(email)}"`;
      const found = await searchAll((p) => (stripe as any).customers.search(p), { query: q });
      stripeCustomers.push(...found);
    } else {
      const listed = await stripe.customers.list({ email, limit: 100 });
      stripeCustomers.push(...(listed.data || []));
    }

    // If still none, retry with the original casing (Stripe can be picky)
    if (stripeCustomers.length === 0 && emailInput && emailInput !== email) {
      const email2 = emailInput.trim();
      try {
        const listed2 = await stripe.customers.list({ email: email2, limit: 100 });
        stripeCustomers.push(...(listed2.data || []));
      } catch {
        // ignore
      }
    }

    for (const c of stripeCustomers) customerIds.push(c.id);

    console.log("[DONATION-MAPPING-SNAPSHOT] Customers", { found: customerIds.length, customerIds });

    // If Stripe has no customer for the email, we still try to find guest checkouts.
    const created = { gte: startTs, lt: endTs };

    type CustomerBlock = {
      customer: string;
      charges: any[];
      invoices: any[];
      sessions: any[];
      paymentIntents: any[];
      subscriptions: any[];
    };

    const perCustomerBlocks: CustomerBlock[] = customerIds.length
      ? await Promise.all(
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
        )
      : [];

    // Guest fallback: list-by-date then filter by email (Stripe Search does NOT support email fields on some objects)
    const listAllWithMeta = async <T>(
      fn: (params: any) => Promise<{ data: T[]; has_more: boolean }>,
      params: Record<string, any>,
      maxPages = 50
    ): Promise<{ items: T[]; capped: boolean }> => {
      const out: T[] = [];
      let starting_after: string | undefined = undefined;
      let capped = false;
      for (let i = 0; i < maxPages; i++) {
        const resp = await fn({ ...params, limit: 100, ...(starting_after ? { starting_after } : {}) });
        out.push(...(resp.data || []));
        if (!resp.has_more || resp.data.length === 0) break;
        const last: any = resp.data[resp.data.length - 1];
        starting_after = last?.id;
        if (!starting_after) break;
        if (i === maxPages - 1 && resp.has_more) capped = true;
      }
      return { items: out, capped };
    };

    let guestFallback: any = null;
    const guestBlocks: CustomerBlock[] = [];

    if (customerIds.length === 0) {
      const [chargesAll, invoicesAll, sessionsAll, pisAll] = await Promise.all([
        listAllWithMeta((p) => stripe.charges.list(p) as any, { created }),
        listAllWithMeta((p) => stripe.invoices.list(p) as any, { created }),
        listAllWithMeta((p) => stripe.checkout.sessions.list(p) as any, { created }),
        listAllWithMeta((p) => stripe.paymentIntents.list(p) as any, { created }),
      ]);

      const charges = (chargesAll.items || []).filter(
        (ch: any) => emailMatches(ch?.billing_details?.email, email) || emailMatches(ch?.receipt_email, email)
      );

      const invoices = (invoicesAll.items || []).filter((inv: any) => emailMatches(inv?.customer_email, email));

      const sessions = (sessionsAll.items || []).filter(
        (s: any) =>
          emailMatches(s?.customer_details?.email, email) ||
          emailMatches(s?.customer_email, email) ||
          emailMatches(s?.customer_details?.email, email)
      );

      const paymentIntents = (pisAll.items || []).filter(
        (pi: any) => emailMatches(pi?.receipt_email, email) || emailMatches(pi?.shipping?.email, email)
      );

      guestBlocks.push({ customer: "(guest)", charges, invoices, sessions, paymentIntents, subscriptions: [] });

      guestFallback = {
        used: true,
        scanned: {
          charges: chargesAll.items.length,
          invoices: invoicesAll.items.length,
          sessions: sessionsAll.items.length,
          payment_intents: pisAll.items.length,
        },
        matched: {
          charges: charges.length,
          invoices: invoices.length,
          sessions: sessions.length,
          payment_intents: paymentIntents.length,
        },
        capped: {
          charges: chargesAll.capped,
          invoices: invoicesAll.capped,
          sessions: sessionsAll.capped,
          payment_intents: pisAll.capped,
        },
      };

      console.log("[DONATION-MAPPING-SNAPSHOT] Guest fallback", guestFallback);
    }

    const perCustomer: CustomerBlock[] = [...perCustomerBlocks, ...guestBlocks];

    const stripeItems: any[] = [];

    const pushStripeItem = (it: any) => stripeItems.push(it);

    for (const block of perCustomer) {
      const cid = block.customer;

      for (const ch of block.charges) {
        const piId = readId((ch as any).payment_intent);
        const meta = (ch as any).metadata || {};
        pushStripeItem({
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
        pushStripeItem({
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
        pushStripeItem({
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
        // Extract invoice_id from payment_intent (can be in `invoice` or `payment_details.order_reference`)
        let invoiceId = readId(piAny.invoice);
        if (!invoiceId && piAny.payment_details?.order_reference) {
          const ref = piAny.payment_details.order_reference;
          if (typeof ref === "string" && ref.startsWith("in_")) invoiceId = ref;
        }
        pushStripeItem({
          type: "payment_intent",
          id: piAny.id,
          created: piAny.created ? new Date((piAny.created as number) * 1000).toISOString() : undefined,
          amount: typeof piAny.amount === "number" ? piAny.amount / 100 : undefined,
          currency: piAny.currency,
          status: piAny.status,
          customer_id: cid,
          payment_intent_id: piAny.id,
          invoice_id: invoiceId,
          order_id: (meta as any).order_id,
          metadata: meta,
          raw: pi,
        });
      }

      for (const sub of block.subscriptions) {
        const subAny: any = sub;
        const meta = subAny.metadata || {};
        pushStripeItem({
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

    // No Stripe Search merge step here. Guest fallback (if needed) is handled via list-by-date + email filtering above.

    const stripeItemsUniq = uniqByKey(stripeItems, (it) => `${it.type}:${it.id}`);

    // Normalize invoice IDs (Stripe sometimes returns shortened invoice references on PaymentIntents)
    const invoiceIds = stripeItemsUniq.filter((i) => i.type === "invoice").map((i) => i.id);
    const resolveInvoiceId = (invId?: string) => {
      if (!invId) return undefined;
      if (invoiceIds.includes(invId)) return invId;
      if (!invId.startsWith("in_")) return invId;
      const matches = invoiceIds.filter((full) => full.startsWith(invId));
      return matches.length === 1 ? matches[0] : invId;
    };

    const stripeItemsResolved = stripeItemsUniq.map((it) => {
      const resolved = resolveInvoiceId(it.invoice_id);
      if (!resolved || resolved === it.invoice_id) return it;
      return { ...it, invoice_id: resolved };
    });

    console.log("[DONATION-MAPPING-SNAPSHOT] Stripe items", {
      total: stripeItemsResolved.length,
      charges: stripeItemsResolved.filter((i) => i.type === "charge").length,
      invoices: stripeItemsResolved.filter((i) => i.type === "invoice").length,
      sessions: stripeItemsResolved.filter((i) => i.type === "checkout_session").length,
      paymentIntents: stripeItemsResolved.filter((i) => i.type === "payment_intent").length,
      subscriptions: stripeItemsResolved.filter((i) => i.type === "subscription").length,
    });

    // ---- DB side (ALL records for that date + email + linked user IDs) ----
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").ilike("email", email);
    const profileIds = (profiles || []).map((p: any) => p.id);

    const start = startIso;
    const end = endIso;

    const donationsByEmail = await supabaseAdmin
      .from("donations")
      .select("*")
      .ilike("donor_email", email)
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
      .ilike("sponsor_email", email)
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
      .ilike("sponsor_email", email)
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
      .ilike("customer_email", email)
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
                `customer_email.ilike.${email}`,
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
      .ilike("user_email", email)
      .gte("donation_date", start)
      .lt("donation_date", end);

    const activeSubscriptionsCache = await supabaseAdmin
      .from("active_subscriptions_cache")
      .select("*")
      .ilike("user_email", email);

    // Fetch combined transactions for this email/date
    const combinedTransactionsByEmail = await supabaseAdmin
      .from("donation_stripe_transactions")
      .select("*")
      .eq("stripe_mode", stripeMode)
      .ilike("email", email)
      .gte("transaction_date", start)
      .lt("transaction_date", end);

    const combinedTransactionsById = profileIds.length
      ? await supabaseAdmin
          .from("donation_stripe_transactions")
          .select("*")
          .in("donor_id", profileIds)
          .gte("transaction_date", start)
          .lt("transaction_date", end)
      : { data: [] as any[] };

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
    const combinedTransactions = uniqById([...(combinedTransactionsByEmail.data || []), ...(combinedTransactionsById.data || [])]);

    // ---- Lightweight auto-linking (for human inspection) ----
    const byPaymentIntentId: Record<string, string[]> = {};
    const byOrderId: Record<string, string[]> = {};
    const byInvoiceId: Record<string, string[]> = {};

    // Suggested clusters = connected components across PI/invoice/order_id
    const itemKeys = stripeItemsResolved.map((it) => `${it.type}:${it.id}`);
    const parent = new Map<string, string>(itemKeys.map((k) => [k, k]));

    const find = (x: string): string => {
      let p = parent.get(x) || x;
      while (p !== (parent.get(p) || p)) p = parent.get(p) || p;
      // path compression
      let cur = x;
      while (cur !== p) {
        const next = parent.get(cur) || cur;
        parent.set(cur, p);
        cur = next;
      }
      return p;
    };

    const unionAll = (arr: string[]) => {
      if (arr.length < 2) return;
      const root = find(arr[0]);
      for (let i = 1; i < arr.length; i++) {
        parent.set(find(arr[i]), root);
      }
    };

    const tmpByPi: Record<string, string[]> = {};
    const tmpByOrder: Record<string, string[]> = {};
    const tmpByInv: Record<string, string[]> = {};

    for (const it of stripeItemsResolved) {
      const key = `${it.type}:${it.id}`;
      const pi = it.payment_intent_id;
      const orderId = it.order_id;
      const invId = it.invoice_id || (it.type === "invoice" ? it.id : undefined);

      if (pi) tmpByPi[pi] = [...(tmpByPi[pi] || []), key];
      if (orderId) tmpByOrder[orderId] = [...(tmpByOrder[orderId] || []), key];
      if (invId) tmpByInv[invId] = [...(tmpByInv[invId] || []), key];
    }

    Object.assign(byPaymentIntentId, tmpByPi);
    Object.assign(byOrderId, tmpByOrder);
    Object.assign(byInvoiceId, tmpByInv);

    for (const arr of Object.values(tmpByPi)) unionAll(arr);
    for (const arr of Object.values(tmpByOrder)) unionAll(arr);
    for (const arr of Object.values(tmpByInv)) unionAll(arr);

    const clustersMap = new Map<string, string[]>();
    for (const k of itemKeys) {
      const r = find(k);
      clustersMap.set(r, [...(clustersMap.get(r) || []), k]);
    }

    const clusters = Array.from(clustersMap.values())
      .filter((c) => c.length > 1)
      .map((c) => c.sort((a, b) => a.localeCompare(b)));

    return new Response(
      JSON.stringify({
        email,
        stripeMode,
        date,
        window: { start: startIso, end: endIso },
        customerIds: uniqByKey(customerIds, (x) => x),
        stripe: {
          items: stripeItemsResolved,
          debug: {
            emailInput,
            emailNormalized: email,
            customerCount: customerIds.length,
            usedSearchApis: {
              customersSearch: Boolean((stripe as any).customers?.search),
              chargesSearch: Boolean((stripe as any).charges?.search),
              invoicesSearch: Boolean((stripe as any).invoices?.search),
              paymentIntentsSearch: Boolean((stripe as any).paymentIntents?.search),
              checkoutSessionsSearch: Boolean((stripe as any).checkout?.sessions?.search),
            },
          },
        },
        database: {
          profiles: profiles || [],
          donations,
          sponsorships,
          receipts,
          orders,
          orderItems: orderItems.data || [],
          donationHistoryCache: donationHistoryCache.data || [],
          activeSubscriptionsCache: activeSubscriptionsCache.data || [],
          combinedTransactions,
        },
        links: { byPaymentIntentId, byInvoiceId, byOrderId, clusters },
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
