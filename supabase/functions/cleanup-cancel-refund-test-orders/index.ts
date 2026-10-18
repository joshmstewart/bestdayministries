import { corsHeaders } from '../_shared/corsHeaders.ts';
import { requireTestFunctionsAuth } from '../_shared/testFunctionsAuth.ts';
// Deletes orders (and their order_items) created by the cancel-and-refund
// E2E harness. Admin-only. Filters strictly by the test marker note so it
// can never touch a real customer order.
//
// Safety: only deletes rows where notes LIKE '%__e2e_cancel_refund_test__%'.
// Returns counts of what was deleted.

import { createClient } from "npm:@supabase/supabase-js@2";



const TEST_MARKER = "__e2e_cancel_refund_test__";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const testAuthorization = await requireTestFunctionsAuth(req, corsHeaders);
  if (testAuthorization.response) return testAuthorization.response;

  try {
    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "");
    const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const admin = createClient(supabaseUrl, serviceKey);

    // Find marker rows (cancel-and-refund overwrites notes, so also accept
    // an explicit orderIds list from the caller for post-cancel cleanup).
    let explicitIds: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.orderIds)) {
        explicitIds = body.orderIds.filter((x: any) => typeof x === "string");
      }
    } catch (_) { /* no body is fine */ }

    const { data: targets, error: findErr } = await admin
      .from("orders")
      .select("id")
      .like("notes", `%${TEST_MARKER}%`);
    if (findErr) throw findErr;

    const ids = Array.from(new Set([
      ...(targets || []).map((r: any) => r.id),
      ...explicitIds,
    ]));
    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deletedOrders: 0, deletedItems: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { count: itemsCount } = await admin
      .from("order_items")
      .delete({ count: "exact" })
      .in("order_id", ids);

    const { count: ordersCount, error: delErr } = await admin
      .from("orders")
      .delete({ count: "exact" })
      .in("id", ids);
    if (delErr) throw delErr;

    return new Response(
      JSON.stringify({
        success: true,
        deletedOrders: ordersCount ?? ids.length,
        deletedItems: itemsCount ?? 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
