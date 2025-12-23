import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shipping constants
const FLAT_SHIPPING_RATE_CENTS = 699; // $6.99
const FREE_SHIPPING_THRESHOLD_CENTS = 3500; // $35.00

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
      shippingFee: number;
      items: CartItem[];
    }>();

    for (const item of typedCartItems) {
      const vendorId = item.products.vendor_id;
      const stripeAccountId = item.products.vendors.stripe_account_id!;
      const itemTotal = Math.round(item.products.price * 100) * item.quantity; // Convert to cents
      
      if (!vendorTotals.has(vendorId)) {
        vendorTotals.set(vendorId, {
          vendorId,
          stripeAccountId,
          subtotal: 0,
          platformFee: 0,
          vendorPayout: 0,
          shippingFee: 0,
          items: []
        });
      }
      
      const vendorData = vendorTotals.get(vendorId)!;
      vendorData.subtotal += itemTotal;
      vendorData.items.push(item);
    }

    // Calculate fees and shipping for each vendor
    for (const vendorData of vendorTotals.values()) {
      // Free shipping if vendor subtotal >= $35, otherwise $6.99
      vendorData.shippingFee = vendorData.subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_RATE_CENTS;
      vendorData.platformFee = Math.round(vendorData.subtotal * (commissionPercentage / 100));
      vendorData.vendorPayout = vendorData.subtotal - vendorData.platformFee;
    }

    const totalSubtotal = Array.from(vendorTotals.values()).reduce((sum, v) => sum + v.subtotal, 0);
    const totalShipping = Array.from(vendorTotals.values()).reduce((sum, v) => sum + v.shippingFee, 0);
    const totalAmount = totalSubtotal + totalShipping;
    const totalPlatformFee = Array.from(vendorTotals.values()).reduce((sum, v) => sum + v.platformFee, 0);
    logStep("Totals calculated", { totalSubtotal, totalShipping, totalAmount, totalPlatformFee, vendorCount: vendorTotals.size });

    // Check or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Create line items for Stripe (products)
    const productLineItems = typedCartItems.map(item => ({
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

    // Add shipping line items for each vendor that has shipping
    const shippingLineItems: typeof productLineItems = [];
    for (const vendorData of vendorTotals.values()) {
      if (vendorData.shippingFee > 0) {
        const vendorName = vendorData.items[0]?.products?.vendors?.business_name || 'Vendor';
        shippingLineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `Shipping (${vendorName})`,
              images: [],
            },
            unit_amount: vendorData.shippingFee,
          },
          quantity: 1,
        });
      }
    }

    const allLineItems = [...productLineItems, ...shippingLineItems];

    // Create order record first (total_amount is in cents)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        total_amount: totalAmount / 100, // Convert back to dollars for DB storage
        stripe_mode: stripeMode,
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Order created", { orderId: order.id });

    // Create order items with fee breakdown (convert cents back to dollars for DB)
    const orderItems = typedCartItems.map(item => {
      const vendorData = vendorTotals.get(item.products.vendor_id)!;
      const itemTotalCents = Math.round(item.products.price * 100) * item.quantity;
      const itemFeeRatio = itemTotalCents / vendorData.subtotal;
      
      return {
        order_id: order.id,
        product_id: item.product_id,
        vendor_id: item.products.vendor_id,
        quantity: item.quantity,
        price_at_time: item.products.price,
        platform_fee: Math.round(vendorData.platformFee * itemFeeRatio) / 100, // Convert cents to dollars
        vendor_payout: Math.round(vendorData.vendorPayout * itemFeeRatio) / 100, // Convert cents to dollars
      };
    });

    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);
    logStep("Order items created", { count: orderItems.length });

    // All orders: platform collects full payment, transfers to vendors on fulfillment
    // This ensures consistent behavior and protects against fraud/chargebacks
    const origin = req.headers.get("origin") || "https://lovable.dev";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: allLineItems,
      mode: "payment",
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/marketplace?canceled=true`,
      // Collect shipping address for physical products
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      metadata: {
        order_id: order.id,
        user_id: user.id,
        stripe_mode: stripeMode,
        vendor_count: vendorTotals.size.toString(),
        total_shipping_cents: totalShipping.toString(),
      },
    };

    logStep("Checkout configured - vendor transfers will occur on fulfillment", { vendorCount: vendorTotals.size });

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
