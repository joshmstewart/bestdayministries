import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[cancel-and-refund-order] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Authenticate caller ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // --- Authorize: admin or owner only ---
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdminOrOwner = (roles || []).some((r: any) => r.role === "admin" || r.role === "owner");
    if (!isAdminOrOwner) {
      log("Forbidden", { userId });
      return new Response(JSON.stringify({ error: "Admin or owner required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, reason } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Load order ---
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, total_amount, stripe_payment_intent_id, stripe_mode, customer_email")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      log("Order not found", { orderId, orderErr });
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Order is already cancelled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Cancelling order", { orderId, status: order.status, mode: order.stripe_mode });

    // --- Refund via Stripe (best-effort) ---
    let refundId: string | null = null;
    let refundError: string | null = null;

    if (order.stripe_payment_intent_id) {
      const stripeMode = order.stripe_mode || "test";
      const stripeKey = stripeMode === "live"
        ? Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_LIVE")
        : Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_TEST");

      if (!stripeKey) {
        refundError = `Missing MARKETPLACE_STRIPE_SECRET_KEY_${stripeMode.toUpperCase()}`;
        log("Stripe key missing", { stripeMode });
      } else {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
          let paymentIntentId = order.stripe_payment_intent_id;

          // Some orders may have stored a checkout session id (cs_...) instead of pi_...
          if (paymentIntentId.startsWith("cs_")) {
            const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
            if (session.payment_intent) {
              paymentIntentId = session.payment_intent as string;
            }
          }

          if (paymentIntentId.startsWith("pi_")) {
            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: "requested_by_customer",
              metadata: { orderId, cancelledBy: userId, reason: reason || "" },
            });
            refundId = refund.id;
            log("Refund created", { refundId, amount: refund.amount });
          } else {
            refundError = `Unrecognized payment id: ${paymentIntentId}`;
          }
        } catch (err: any) {
          refundError = err?.message || "Refund failed";
          log("Refund error", { error: refundError });
        }
      }
    } else {
      refundError = "No Stripe payment id on order";
      log("No payment id, skipping refund");
    }

    // --- Update order + items to cancelled (always, even if refund failed) ---
    const cancellationNote = `Cancelled by admin ${userId} at ${new Date().toISOString()}${reason ? ` — ${reason}` : ""}${refundId ? ` (Stripe refund ${refundId})` : refundError ? ` (refund FAILED: ${refundError})` : ""}`;

    const { error: updErr } = await admin
      .from("orders")
      .update({
        status: "cancelled",
        notes: cancellationNote,
      })
      .eq("id", orderId);

    if (updErr) {
      log("Order update failed", { updErr });
      throw updErr;
    }

    await admin
      .from("order_items")
      .update({ fulfillment_status: "cancelled" })
      .eq("order_id", orderId)
      .neq("fulfillment_status", "delivered");

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        refundId,
        refundError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    log("Fatal error", { error: err?.message });
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
