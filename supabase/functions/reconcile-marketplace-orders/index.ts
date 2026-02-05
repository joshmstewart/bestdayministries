import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE-MARKETPLACE] ${step}${detailsStr}`);
};

interface ReconciliationResult {
  orderId: string;
  oldStatus: string;
  newStatus: string | null;
  action: string;
  stripeSessionId?: string;
  stripeStatus?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting marketplace order reconciliation");

    // Parse optional vendorId for manual refresh
    let vendorId: string | null = null;
    let limit = 100;
    
    try {
      const body = await req.json();
      vendorId = body.vendorId || null;
      limit = body.limit || 100;
    } catch {
      // No body is fine for cron jobs
    }

    logStep("Parameters", { vendorId, limit });

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // IMPORTANT: Marketplace checkout uses MARKETPLACE_* Stripe keys.
    // Using donation/sponsorship keys here will cause "No such checkout.session" errors.
    const stripeLiveKey = Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_LIVE");
    const stripeTestKey = Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_TEST");

    const stripeLive = stripeLiveKey ? new Stripe(stripeLiveKey, { apiVersion: "2023-10-16" }) : null;
    const stripeTest = stripeTestKey ? new Stripe(stripeTestKey, { apiVersion: "2023-10-16" }) : null;

    const getStripeClient = (mode: string | null) => {
      if (mode === "live") return stripeLive ?? stripeTest;
      if (mode === "test") return stripeTest ?? stripeLive;
      // Fallback: prefer test for unknown
      return stripeTest ?? stripeLive;
    };

    logStep("Stripe clients initialized", { 
      hasLive: !!stripeLive, 
      hasTest: !!stripeTest 
    });

    

    // Query pending orders
    // Skip orders created less than 5 minutes ago (allow normal verification flow)
    // Only look at orders from the last 30 days
    let query = supabaseAdmin
      .from("orders")
      .select("id, status, stripe_checkout_session_id, created_at, customer_id, stripe_mode")
      .eq("status", "pending")
      .not("stripe_checkout_session_id", "is", null)
      .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Older than 5 min
      .gt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Within 30 days
      .order("created_at", { ascending: true })
      .limit(limit);

    // If vendorId provided, filter to orders containing their items
    if (vendorId) {
      const { data: vendorOrderIds } = await supabaseAdmin
        .from("order_items")
        .select("order_id")
        .eq("vendor_id", vendorId);
      
      if (vendorOrderIds && vendorOrderIds.length > 0) {
        const orderIds = [...new Set(vendorOrderIds.map(o => o.order_id))];
        query = query.in("id", orderIds);
      } else {
        logStep("No orders found for vendor", { vendorId });
        return new Response(JSON.stringify({
          success: true,
          message: "No pending orders to reconcile",
          results: [],
          summary: { confirmed: 0, cancelled: 0, skipped: 0, errors: 0 }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: pendingOrders, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Failed to query pending orders: ${queryError.message}`);
    }

    logStep("Found pending orders", { count: pendingOrders?.length || 0 });

    const results: ReconciliationResult[] = [];
    let confirmed = 0;
    let cancelled = 0;
    let skipped = 0;
    let errors = 0;

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    for (const order of pendingOrders || []) {
      const result: ReconciliationResult = {
        orderId: order.id,
        oldStatus: order.status,
        newStatus: null,
        action: "skipped",
        stripeSessionId: order.stripe_checkout_session_id,
      };

      try {
        // Get the correct Stripe client based on order's stripe_mode
        const stripe = getStripeClient(order.stripe_mode);
        if (!stripe) {
          throw new Error(`No Stripe client available for mode: ${order.stripe_mode}`);
        }

        // Retrieve Stripe checkout session
        const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
        result.stripeStatus = session.payment_status;

        logStep("Checked Stripe session", {
          orderId: order.id,
          sessionId: order.stripe_checkout_session_id,
          paymentStatus: session.payment_status,
          sessionStatus: session.status
        });

        if (session.payment_status === "paid") {
          // Payment was successful but verification was missed
          // Update order to processing
          const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({
              status: "processing",
              updated_at: new Date().toISOString()
            })
            .eq("id", order.id);

          if (updateError) {
            throw new Error(`Failed to update order: ${updateError.message}`);
          }

          // Update order_items to pending (ready for fulfillment)
          await supabaseAdmin
            .from("order_items")
            .update({ fulfillment_status: "pending" })
            .eq("order_id", order.id);

          // Clear shopping cart if we have customer_id
          if (order.customer_id) {
            await supabaseAdmin
              .from("shopping_cart")
              .delete()
              .eq("user_id", order.customer_id);
          }

          result.newStatus = "processing";
          result.action = "confirmed";
          confirmed++;

          logStep("Confirmed paid order", { orderId: order.id });

        } else if (session.status === "expired" || 
                   (session.payment_status === "unpaid" && 
                    Date.now() - new Date(order.created_at).getTime() > TWO_HOURS_MS)) {
          // Session expired or unpaid for more than 2 hours - cancel it
          const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString()
            })
            .eq("id", order.id);

          if (updateError) {
            throw new Error(`Failed to cancel order: ${updateError.message}`);
          }

          // Update order_items status
          await supabaseAdmin
            .from("order_items")
            .update({ fulfillment_status: "cancelled" })
            .eq("order_id", order.id);

          result.newStatus = "cancelled";
          result.action = "auto_cancelled";
          cancelled++;

          logStep("Cancelled abandoned order", { 
            orderId: order.id, 
            reason: session.status === "expired" ? "session_expired" : "unpaid_timeout"
          });

        } else {
          // Still pending but within the 2-hour window - skip
          result.action = "skipped";
          skipped++;

          logStep("Skipped order (still within window)", { orderId: order.id });
        }

      } catch (err) {
        result.action = "error";
        result.error = err instanceof Error ? err.message : String(err);
        errors++;

        logStep("Error processing order", { orderId: order.id, error: result.error });
      }

      results.push(result);
    }

    const summary = { confirmed, cancelled, skipped, errors };
    logStep("Reconciliation complete", summary);

    // Log reconciliation results to database for visibility
    try {
      await supabaseAdmin
        .from("marketplace_reconciliation_log")
        .insert({
          orders_checked: pendingOrders?.length || 0,
          confirmed,
          cancelled,
          skipped,
          errors,
          details: { results, vendorId, limit }
        });
      logStep("Logged reconciliation results to database");
    } catch (logError) {
      logStep("Failed to log reconciliation results", { error: logError });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Reconciled ${pendingOrders?.length || 0} orders`,
      results,
      summary
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
