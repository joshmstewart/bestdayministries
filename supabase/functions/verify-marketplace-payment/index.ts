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

// Helper to log failures to error_logs table for admin visibility
async function logVerificationFailure(
  supabaseClient: any,
  reason: string,
  details: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from("error_logs")
      .insert({
        error_message: reason,
        error_type: "marketplace_payment_verification",
        severity: "warning",
        metadata: details,
        environment: Deno.env.get("DENO_ENV") || "production",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log verification failure:", error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error("Error logging verification failure:", err);
    return null;
  }
}

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
    const { session_id, order_id, guest_session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");
    if (!order_id) throw new Error("order_id is required");
    logStep("Request parsed", { session_id, order_id, guest_session_id });

    // Try to authenticate user (optional - may be missing on redirect back from Stripe)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
      if (user) {
        logStep("User authenticated", { userId: user.id });
      }
    }

    // ROBUST VERIFICATION: Fetch order by ID first (no user filter)
    // Then validate using stripe_checkout_session_id match
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      const debugLogId = await logVerificationFailure(supabaseClient, "Order not found", {
        order_id,
        session_id,
        has_auth_header: !!authHeader,
        user_id: user?.id || null,
        guest_session_id,
        db_error: orderError?.message || null,
      });
      logStep("ERROR - Order not found", { order_id, debugLogId });
      return new Response(
        JSON.stringify({ 
          error: "Order not found", 
          status: "failed",
          debug_log_id: debugLogId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Order found", { 
      orderId: order.id, 
      status: order.status, 
      customerId: order.customer_id,
      userId: order.user_id,
      storedSessionId: order.stripe_checkout_session_id 
    });

    // CRITICAL: Validate that the incoming session_id matches the order's stored session_id
    // This is our primary security check - Stripe session IDs are not guessable
    if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session_id) {
      const debugLogId = await logVerificationFailure(supabaseClient, "Session ID mismatch", {
        order_id,
        incoming_session_id: session_id,
        stored_session_id: order.stripe_checkout_session_id,
        has_auth_header: !!authHeader,
        user_id: user?.id || null,
        order_customer_id: order.customer_id,
        order_user_id: order.user_id,
      });
      logStep("ERROR - Session ID mismatch", { debugLogId });
      return new Response(
        JSON.stringify({ 
          error: "Session verification failed", 
          status: "failed",
          debug_log_id: debugLogId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Optional additional check: if user is authenticated, verify they match
    // But don't fail if user session is missing (common after Stripe redirect)
    if (user && order.customer_id && order.customer_id !== user.id) {
      logStep("Warning: Authenticated user doesn't match order customer_id", {
        userId: user.id,
        orderCustomerId: order.customer_id
      });
      // Don't fail - session_id match is sufficient proof
    }

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
    
    if (!stripeKey) {
      const debugLogId = await logVerificationFailure(supabaseClient, `Stripe ${stripeMode} key not configured`, {
        order_id,
        stripe_mode: stripeMode,
      });
      throw new Error(`Stripe ${stripeMode} key not configured`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session with shipping details
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['shipping_details'],
      });
    } catch (stripeError) {
      const debugLogId = await logVerificationFailure(supabaseClient, "Failed to retrieve Stripe session", {
        order_id,
        session_id,
        stripe_mode: stripeMode,
        stripe_error: stripeError instanceof Error ? stripeError.message : String(stripeError),
      });
      logStep("ERROR - Stripe session retrieval failed", { debugLogId });
      return new Response(
        JSON.stringify({ 
          error: "Failed to verify with payment provider", 
          status: "failed",
          debug_log_id: debugLogId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    logStep("Stripe session retrieved", { paymentStatus: session.payment_status });

    if (session.payment_status === "paid") {
      // Extract shipping address from Stripe session
      const shippingDetails = session.shipping_details;
      let shippingAddress = null;
      
      if (shippingDetails?.address) {
        shippingAddress = {
          name: shippingDetails.name || '',
          line1: shippingDetails.address.line1 || '',
          line2: shippingDetails.address.line2 || '',
          city: shippingDetails.address.city || '',
          state: shippingDetails.address.state || '',
          postal_code: shippingDetails.address.postal_code || '',
          country: shippingDetails.address.country || 'US',
        };
        logStep("Shipping address extracted", { city: shippingAddress.city, country: shippingAddress.country });
      }

      // Update order status and shipping address
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
          shipping_address: shippingAddress,
        })
        .eq("id", order_id);

      if (updateError) throw new Error(`Failed to update order: ${updateError.message}`);
      logStep("Order updated to paid with shipping address");

      // Clear cart - use customer_id/user_id from order since user session may be missing
      const orderOwnerId = order.customer_id || order.user_id;
      if (orderOwnerId) {
        const { error: cartError } = await supabaseClient
          .from("shopping_cart")
          .delete()
          .eq("user_id", orderOwnerId);

        if (cartError) {
          logStep("Warning: Failed to clear user cart", { error: cartError.message });
        } else {
          logStep("User cart cleared", { userId: orderOwnerId });
        }
      } else if (guest_session_id) {
        const { error: cartError } = await supabaseClient
          .from("shopping_cart")
          .delete()
          .eq("session_id", guest_session_id);

        if (cartError) {
          logStep("Warning: Failed to clear guest cart", { error: cartError.message });
        } else {
          logStep("Guest cart cleared");
        }
      }

      // Trigger Printify order creation for any Printify products
      try {
        const printifyResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-printify-order`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ orderId: order_id }),
          }
        );
        
        const printifyResult = await printifyResponse.json();
        logStep("Printify order creation result", printifyResult);
      } catch (printifyError) {
        // Log but don't fail the payment verification if Printify fails
        logStep("Warning: Printify order creation failed", { 
          error: printifyError instanceof Error ? printifyError.message : String(printifyError) 
        });
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
      const debugLogId = await logVerificationFailure(supabaseClient, "Payment not successful", {
        order_id,
        session_id,
        payment_status: session.payment_status,
        stripe_mode: stripeMode,
      });

      await supabaseClient
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "failed",
          message: "Payment was not successful",
          debug_log_id: debugLogId
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
