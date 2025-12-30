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
    const { session_id, order_id, guest_session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");
    if (!order_id) throw new Error("order_id is required");
    logStep("Request parsed", { session_id, order_id, guest_session_id });

    // Try to authenticate user (optional for guest checkout)
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

    // Get order - try authenticated user first, then fall back to guest
    let order;
    
    if (user) {
      // Authenticated user - verify order belongs to them
      const { data, error } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .eq("user_id", user.id)
        .single();
      
      if (error || !data) throw new Error("Order not found or unauthorized");
      order = data;
    } else {
      // Guest checkout - get order by ID and verify it's a guest order (no user_id)
      const { data, error } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .is("user_id", null)
        .single();
      
      if (error || !data) throw new Error("Order not found or unauthorized");
      order = data;
    }
    
    logStep("Order found", { orderId: order.id, status: order.status, isGuest: !user });

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

    // Retrieve the checkout session with shipping details
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['shipping_details'],
    });
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

      // Clear cart based on user type
      if (user) {
        const { error: cartError } = await supabaseClient
          .from("shopping_cart")
          .delete()
          .eq("user_id", user.id);

        if (cartError) {
          logStep("Warning: Failed to clear user cart", { error: cartError.message });
        } else {
          logStep("User cart cleared");
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
