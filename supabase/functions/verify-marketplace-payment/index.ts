import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-MARKETPLACE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Parse request body
    const { session_id, order_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");
    if (!order_id) throw new Error("order_id is required");
    logStep("Request parsed", { session_id, order_id });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get order and verify ownership
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) throw new Error("Order not found or unauthorized");
    logStep("Order found", { orderId: order.id, status: order.status });

    // If already paid, return success
    if (order.status === "paid" || order.status === "processing") {
      logStep("Order already processed");
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: order.status,
          message: "Payment already verified" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Determine Stripe mode from order
    const stripeMode = order.stripe_mode || "test";
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") 
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    
    if (!stripeKey) throw new Error(`Stripe ${stripeMode} key not configured`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session retrieved", { paymentStatus: session.payment_status });

    if (session.payment_status === "paid") {
      // Update order status
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      if (updateError) throw new Error(`Failed to update order: ${updateError.message}`);
      logStep("Order updated to paid");

      // Clear user's cart
      const { error: cartError } = await supabaseClient
        .from("shopping_cart")
        .delete()
        .eq("user_id", user.id);

      if (cartError) {
        logStep("Warning: Failed to clear cart", { error: cartError.message });
      } else {
        logStep("Cart cleared");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "paid",
          order_id: order.id,
          message: "Payment verified successfully" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else if (session.payment_status === "unpaid") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "pending",
          message: "Payment not yet completed" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      // Payment failed or was canceled
      await supabaseClient
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "failed",
          message: "Payment was not successful" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
