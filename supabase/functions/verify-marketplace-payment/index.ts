import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TraceEntry = {
  ts: string;
  step: string;
  details?: unknown;
};

const createLogger = () => {
  const trace: TraceEntry[] = [];

  const logStep = (step: string, details?: unknown) => {
    trace.push({ ts: new Date().toISOString(), step, details });
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[VERIFY-MARKETPLACE-PAYMENT] ${step}${detailsStr}`);
  };

  return { trace, logStep };
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
        url: details?.request_url ?? null,
        user_id: details?.user_id ?? null,
        user_email: details?.user_email ?? null,
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

  const { trace, logStep } = createLogger();

  const respondFailure = async (
    statusCode: number,
    reason: string,
    details: Record<string, any> = {}
  ) => {
    const debugLogId = await logVerificationFailure(supabaseClient, reason, {
      ...details,
      trace,
    });

    logStep("FAILURE_RESPONSE", { reason, debugLogId });

    return new Response(
      JSON.stringify({
        status: "failed",
        error: reason,
        message: reason,
        debug_log_id: debugLogId,
        details,
        trace,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  };

  try {
    logStep("Function started");

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { session_id, order_id, guest_session_id } = body || {};

    if (!session_id) {
      return await respondFailure(400, "session_id is required", {
        request_url: req.headers.get("referer") ?? null,
        request_body: body,
      });
    }

    if (!order_id) {
      return await respondFailure(400, "order_id is required", {
        request_url: req.headers.get("referer") ?? null,
        request_body: body,
      });
    }

    logStep("Request parsed", { session_id, order_id, guest_session_id });

    // Try to authenticate user (optional - may be missing on redirect back from Stripe)
    const authHeader = req.headers.get("Authorization");
    let user: any = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) {
        logStep("Auth token present but getUser failed", { error: userError.message });
      }
      user = userData?.user || null;
      if (user) {
        logStep("User authenticated", { userId: user.id });
      }
    } else {
      logStep("No Authorization header (auth optional)");
    }

    // ROBUST VERIFICATION: Fetch order by ID first (no user filter)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return await respondFailure(400, "Order not found", {
        order_id,
        session_id,
        guest_session_id,
        has_auth_header: !!authHeader,
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        db_error: orderError?.message ?? null,
        request_url: req.headers.get("referer") ?? null,
      });
    }

    logStep("Order found", {
      orderId: order.id,
      status: order.status,
      customerId: order.customer_id,
      userId: order.user_id,
      storedSessionId: order.stripe_checkout_session_id,
      stripeMode: order.stripe_mode,
    });

    // Primary security check: validate incoming session_id matches stored session_id
    if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session_id) {
      return await respondFailure(400, "Session ID mismatch", {
        order_id,
        incoming_session_id: session_id,
        stored_session_id: order.stripe_checkout_session_id,
        has_auth_header: !!authHeader,
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        order_customer_id: order.customer_id,
        order_user_id: order.user_id,
        request_url: req.headers.get("referer") ?? null,
      });
    }

    // Optional additional check: if user is authenticated, verify they match
    if (user && order.customer_id && order.customer_id !== user.id) {
      logStep("Warning: Authenticated user doesn't match order customer_id", {
        userId: user.id,
        orderCustomerId: order.customer_id,
      });
      // Don't fail - session_id match is sufficient proof
    }

    // If already processed, return success
    const alreadyProcessedStatuses = ["processing", "shipped", "completed", "refunded"]; // enum-backed
    if (alreadyProcessedStatuses.includes(String(order.status))) {
      logStep("Order already processed", { status: order.status });
      return new Response(
        JSON.stringify({
          success: true,
          status: order.status,
          message: "Payment already verified",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Determine Stripe mode from order
    const stripeMode = order.stripe_mode || "test";
    const stripeKey =
      stripeMode === "live"
        ? Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_LIVE")
        : Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_TEST");

    if (!stripeKey) {
      return await respondFailure(500, `Stripe ${stripeMode} key not configured`, {
        order_id,
        session_id,
        stripe_mode: stripeMode,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    let session: any;
    try {
      // shipping_details is included by default, no expand needed
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch (stripeError) {
      const errAny = stripeError as any;
      return await respondFailure(400, "Failed to retrieve Stripe session", {
        order_id,
        session_id,
        stripe_mode: stripeMode,
        stripe_error: stripeError instanceof Error ? stripeError.message : String(stripeError),
        stripe_error_type: errAny?.type ?? null,
        stripe_error_code: errAny?.code ?? null,
        stripe_status_code: errAny?.statusCode ?? null,
        stripe_request_id: errAny?.requestId ?? null,
        stripe_raw: errAny ? JSON.parse(JSON.stringify(errAny)) : null,
      });
    }

    // Log full shipping-related fields from Stripe session for debugging
    logStep("Stripe session retrieved", {
      paymentStatus: session.payment_status,
      status: session.status,
      hasShipping: !!session.shipping_details,
      hasPaymentIntent: !!session.payment_intent,
      shipping_details: session.shipping_details,
      shipping_cost: session.shipping_cost,
      shipping_options: session.shipping_options,
      shipping_address_collection: session.shipping_address_collection,
      customer_details: session.customer_details,
    });

    if (session.payment_status === "paid") {
      // Extract shipping address from Stripe session
      // Try shipping_details first, then fall back to customer_details.address
      const shippingDetails = session.shipping_details;
      const customerDetails = session.customer_details;
      let shippingAddress: any = null;

      // Helper to determine the best name to use
      // Stripe Link sometimes only provides first name in shipping_details.name
      // customer_details.name often has the full name the user entered
      const getBestName = (): string => {
        const shippingName = shippingDetails?.name || "";
        const customerName = customerDetails?.name || "";
        
        // If shipping name has no space (single word/first name only), prefer customer_details.name
        if (shippingName && !shippingName.includes(" ") && customerName.includes(" ")) {
          logStep("Using customer_details.name (shipping name appears incomplete)", {
            shippingName,
            customerName,
          });
          return customerName;
        }
        
        // Otherwise use shipping name if available, then customer name
        return shippingName || customerName || "";
      };

      if (shippingDetails?.address) {
        shippingAddress = {
          name: getBestName(),
          line1: shippingDetails.address.line1 || "",
          line2: shippingDetails.address.line2 || "",
          city: shippingDetails.address.city || "",
          state: shippingDetails.address.state || "",
          postal_code: shippingDetails.address.postal_code || "",
          country: shippingDetails.address.country || "US",
        };
        logStep("Shipping address extracted from shipping_details", {
          name: shippingAddress.name,
          city: shippingAddress.city,
          country: shippingAddress.country,
        });
      } else if (customerDetails?.address) {
        // Fallback: use customer_details.address (Stripe sometimes puts shipping here)
        shippingAddress = {
          name: getBestName(),
          line1: customerDetails.address.line1 || "",
          line2: customerDetails.address.line2 || "",
          city: customerDetails.address.city || "",
          state: customerDetails.address.state || "",
          postal_code: customerDetails.address.postal_code || "",
          country: customerDetails.address.country || "US",
        };
        logStep("Shipping address extracted from customer_details.address", {
          name: shippingAddress.name,
          city: shippingAddress.city,
          country: shippingAddress.country,
        });
      } else {
        logStep("No shipping address found in session");
      }

      // IMPORTANT: orders.status is an enum. It does NOT include "paid".
      // Valid values: pending | processing | shipped | completed | cancelled | refunded
      const updatePayload = {
          status: "processing",
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
        shipping_address: shippingAddress,
      };

      logStep("Updating order", { order_id, updatePayload });

      const { error: updateError } = await supabaseClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order_id);

      if (updateError) {
        return await respondFailure(400, `Failed to update order: ${updateError.message}`, {
          order_id,
          session_id,
          stripe_mode: stripeMode,
          update_payload: updatePayload,
        });
      }

      logStep("Order updated", { status: "completed" });

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
      } else {
        logStep("Cart not cleared (no owner id or guest session id)");
      }

      // Trigger Printify order creation for any Printify products
      try {
        const printifyResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-printify-order`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ orderId: order_id }),
          }
        );

        const printifyResult = await printifyResponse.json();
        logStep("Printify order creation result", {
          ok: printifyResponse.ok,
          status: printifyResponse.status,
          body: printifyResult,
        });
      } catch (printifyError) {
        // Log but don't fail the payment verification if Printify fails
        logStep("Warning: Printify order creation failed", {
          error: printifyError instanceof Error ? printifyError.message : String(printifyError),
        });
      }

      // Send order confirmation email
      try {
        const customerEmail = session.customer_details?.email || session.customer_email || order.customer_email;
        if (customerEmail) {
          const emailResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-confirmation`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ orderId: order_id, customerEmail }),
            }
          );

          const emailResult = await emailResponse.json();
          logStep("Order confirmation email result", {
            ok: emailResponse.ok,
            status: emailResponse.status,
            body: emailResult,
          });
        } else {
          logStep("Warning: No customer email found for order confirmation");
        }
      } catch (emailError) {
        // Log but don't fail the payment verification if email fails
        logStep("Warning: Order confirmation email failed", {
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          order_id: order.id,
          message: "Payment verified successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (session.payment_status === "unpaid") {
      return new Response(
        JSON.stringify({
          success: false,
          status: "pending",
          message: "Payment not yet completed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Payment failed or was canceled
    // Update order to cancelled (enum-backed)
    const { error: cancelError } = await supabaseClient
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order_id);

    if (cancelError) {
      return await respondFailure(400, `Payment not successful, and failed to mark cancelled: ${cancelError.message}`, {
        order_id,
        session_id,
        stripe_mode: stripeMode,
        payment_status: session.payment_status,
      });
    }

    return await respondFailure(200, "Payment was not successful", {
      order_id,
      session_id,
      stripe_mode: stripeMode,
      payment_status: session.payment_status,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("UNHANDLED_ERROR", { message: errorMessage });
    return await respondFailure(400, errorMessage, {
      request_url: req.headers.get("referer") ?? null,
    });
  }
});
