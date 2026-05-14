// Deletes orders (and their order_items) created by the cancel-and-refund
// E2E harness. Admin-only. Filters strictly by the test marker note so it
// can never touch a real customer order.
//
// Safety: only deletes rows where notes LIKE '%__e2e_cancel_refund_test__%'.
// Returns counts of what was deleted.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TEST_MARKER = "__e2e_cancel_refund_test__";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdminOrOwner = (roles || []).some(
      (r: any) => r.role === "admin" || r.role === "owner",
    );
    if (!isAdminOrOwner) {
      return new Response(
        JSON.stringify({ error: "Admin or owner required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Find marker rows
    const { data: targets, error: findErr } = await admin
      .from("orders")
      .select("id")
      .like("notes", `%${TEST_MARKER}%`);
    if (findErr) throw findErr;

    const ids = (targets || []).map((r: any) => r.id);
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
