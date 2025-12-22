import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARKETPLACE-CHECKOUT] ${step}${detailsStr}`);
};

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    vendor_id: string;
    image_url?: string;
    vendors: {
      id: string;
      business_name: string;
      stripe_account_id: string | null;
      stripe_charges_enabled: boolean;
    };
  };
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's cart items with product and vendor details
    const { data: cartItems, error: cartError } = await supabaseClient
      .from("shopping_cart")
      .select(`
        id,
        product_id,
        quantity,
        products (
          id,
          name,
          price,
          vendor_id,
          image_url,
          vendors (
            id,
            business_name,
            stripe_account_id,
            stripe_charges_enabled
          )
        )
      `)
      .eq("user_id", user.id);

    if (cartError) throw new Error(`Failed to fetch cart: ${cartError.message}`);
    if (!cartItems || cartItems.length === 0) throw new Error("Cart is empty");
    logStep("Cart items fetched", { count: cartItems.length });

    // Type assertion for nested data
    const typedCartItems = cartItems as unknown as CartItem[];

    // Verify all vendors can receive payments
    for (const item of typedCartItems) {
      if (!item.products?.vendors?.stripe_account_id) {
        throw new Error(`Vendor "${item.products?.vendors?.business_name || 'Unknown'}" has not completed Stripe setup`);
      }
      if (!item.products?.vendors?.stripe_charges_enabled) {
        throw new Error(`Vendor "${item.products?.vendors?.business_name || 'Unknown'}" cannot receive payments yet`);
      }
    }

    // Get commission percentage
    const { data: commissionData } = await supabaseClient
      .from("commission_settings")
      .select("commission_percentage")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    const commissionPercentage = commissionData?.commission_percentage ?? 10;
    logStep("Commission percentage", { commissionPercentage });

    // Determine Stripe mode
    const { data: appSettings } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "stripe_mode")
      .single();

    const stripeMode = appSettings?.setting_value === "live" ? "live" : "test";
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") 
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    
    if (!stripeKey) throw new Error(`Stripe ${stripeMode} key not configured`);
    logStep("Stripe mode determined", { stripeMode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate totals and group by vendor
    const vendorTotals = new Map<string, { 
      vendorId: string;
      stripeAccountId: string;
      subtotal: number;
      platformFee: number;
      vendorPayout: number;
      items: CartItem[];
    }>();

    for (const item of typedCartItems) {
      const vendorId = item.products.vendor_id;
      const stripeAccountId = item.products.vendors.stripe_account_id!;
      const itemTotal = item.products.price * item.quantity;
      
      if (!vendorTotals.has(vendorId)) {
        vendorTotals.set(vendorId, {
          vendorId,
          stripeAccountId,
          subtotal: 0,
          platformFee: 0,
          vendorPayout: 0,
          items: []
        });
      }
      
      const vendorData = vendorTotals.get(vendorId)!;
      vendorData.subtotal += itemTotal;
      vendorData.items.push(item);
    }

    // Calculate fees for each vendor
    for (const vendorData of vendorTotals.values()) {
      vendorData.platformFee = Math.round(vendorData.subtotal * (commissionPercentage / 100));
      vendorData.vendorPayout = vendorData.subtotal - vendorData.platformFee;
    }

    const totalAmount = Array.from(vendorTotals.values()).reduce((sum, v) => sum + v.subtotal, 0);
    const totalPlatformFee = Array.from(vendorTotals.values()).reduce((sum, v) => sum + v.platformFee, 0);
    logStep("Totals calculated", { totalAmount, totalPlatformFee, vendorCount: vendorTotals.size });

    // Check or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Create line items for Stripe
    const lineItems = typedCartItems.map(item => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.products.name,
          images: item.products.image_url ? [item.products.image_url] : [],
        },
        unit_amount: Math.round(item.products.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Create order record first
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        total_amount: totalAmount,
        stripe_mode: stripeMode,
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Order created", { orderId: order.id });

    // Create order items with fee breakdown
    const orderItems = typedCartItems.map(item => {
      const vendorData = vendorTotals.get(item.products.vendor_id)!;
      const itemTotal = item.products.price * item.quantity;
      const itemFeeRatio = itemTotal / vendorData.subtotal;
      
      return {
        order_id: order.id,
        product_id: item.product_id,
        vendor_id: item.products.vendor_id,
        quantity: item.quantity,
        price_at_time: item.products.price,
        platform_fee: Math.round(vendorData.platformFee * itemFeeRatio * 100) / 100,
        vendor_payout: Math.round(vendorData.vendorPayout * itemFeeRatio * 100) / 100,
      };
    });

    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);
    logStep("Order items created", { count: orderItems.length });

    // For multi-vendor orders, we collect the full amount and transfer later
    // For single vendor, we can use direct charges with application_fee
    const isSingleVendor = vendorTotals.size === 1;
    const origin = req.headers.get("origin") || "https://lovable.dev";

    let sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/marketplace?canceled=true`,
      metadata: {
        order_id: order.id,
        user_id: user.id,
        stripe_mode: stripeMode,
        vendor_count: vendorTotals.size.toString(),
      },
    };

    if (isSingleVendor) {
      // Single vendor - use destination charge with application fee
      const vendorData = Array.from(vendorTotals.values())[0];
      sessionConfig.payment_intent_data = {
        application_fee_amount: Math.round(totalPlatformFee * 100), // Convert to cents
        transfer_data: {
          destination: vendorData.stripeAccountId,
        },
      };
      logStep("Single vendor checkout", { vendorId: vendorData.vendorId, stripeAccountId: vendorData.stripeAccountId });
    } else {
      // Multi-vendor - collect full amount, transfer on fulfillment
      logStep("Multi-vendor checkout - transfers will be created on fulfillment");
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id });

    // Update order with session ID
    await supabaseClient
      .from("orders")
      .update({ 
        stripe_checkout_session_id: session.id,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        order_id: order.id,
        session_id: session.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
