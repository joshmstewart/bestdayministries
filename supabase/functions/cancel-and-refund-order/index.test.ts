// E2E test for cancel-and-refund-order.
//
// Flow:
//   1. Ensure persistent `testadmin@example.com` exists (via create-persistent-test-accounts).
//   2. Sign in as that admin via supabase-js → real user JWT.
//   3. Insert a throwaway TEST-mode order with NO stripe_payment_intent_id
//      (so the function exercises the full auth + DB-update path without
//      ever touching Stripe / real money).
//   4. POST to cancel-and-refund-order with the admin Bearer token.
//   5. Assert 200, success=true, refundError mentions "No Stripe payment id",
//      order.status === "cancelled", all order_items cancelled.
//   6. Hard-delete the synthetic order + items (it never existed in Stripe).
//
// Safety: this test ONLY operates on a row it just inserted whose id it owns,
// and that row has no Stripe linkage. It cannot affect any real customer order.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ADMIN_EMAIL = "testadmin@example.com";
const ADMIN_PASSWORD = "testpassword123";

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

async function ensureAdminAccount() {
  // Idempotent — function creates if missing, no-op if exists.
  const res = await fetch(`${FUNCTIONS_URL}/create-persistent-test-accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({}),
  });
  await res.text(); // drain body
}

async function signInAsAdmin(): Promise<string> {
  const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await auth.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Admin sign-in failed: ${error?.message || "no session"}`);
  }
  return data.session.access_token;
}

async function seedThrowawayOrder(adminUserId: string): Promise<string> {
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await svc
    .from("orders")
    .insert({
      user_id: adminUserId,
      customer_email: null, // skip the email branch
      total_amount: 0.5,
      subtotal: 0.5,
      shipping_amount: 0,
      tax_amount: 0,
      status: "pending",
      stripe_mode: "test",
      stripe_payment_intent_id: null, // ← forces "No Stripe payment id" branch
      metadata: { __e2e_cancel_refund_test: true },
    })
    .select("id")
    .single();
  if (error) throw new Error(`Seed order failed: ${error.message}`);

  await svc.from("order_items").insert({
    order_id: data.id,
    product_id: null,
    vendor_id: null,
    quantity: 1,
    unit_price: 0.5,
    subtotal: 0.5,
    fulfillment_status: "pending",
  });

  return data.id;
}

async function cleanupOrder(orderId: string) {
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  await svc.from("order_items").delete().eq("order_id", orderId);
  await svc.from("orders").delete().eq("id", orderId);
}

Deno.test("cancel-and-refund-order: authenticated admin E2E (no Stripe PI)", async () => {
  await ensureAdminAccount();
  const token = await signInAsAdmin();

  // Resolve admin user id via /auth/v1/user
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const userBody = await userRes.json();
  const adminUserId = userBody.id as string;
  assert(adminUserId, "could not resolve admin user id");

  const orderId = await seedThrowawayOrder(adminUserId);

  try {
    const res = await fetch(`${FUNCTIONS_URL}/cancel-and-refund-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, reason: "E2E auth test" }),
    });

    const body = await res.json();
    assertEquals(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assertEquals(body.success, true);
    assertEquals(body.orderId, orderId);
    assertEquals(body.refundId, null);
    assert(
      typeof body.refundError === "string" &&
        body.refundError.toLowerCase().includes("no stripe payment id"),
      `expected refundError about missing Stripe PI, got: ${body.refundError}`,
    );

    // Verify DB side-effects
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: order } = await svc
      .from("orders")
      .select("status, cancellation_reason, cancelled_at")
      .eq("id", orderId)
      .single();
    assertEquals(order?.status, "cancelled");
    assert(order?.cancelled_at, "cancelled_at should be set");

    const { data: items } = await svc
      .from("order_items")
      .select("fulfillment_status")
      .eq("order_id", orderId);
    assert(items && items.length > 0);
    for (const it of items) {
      assertEquals(it.fulfillment_status, "cancelled");
    }
  } finally {
    await cleanupOrder(orderId);
  }
});
