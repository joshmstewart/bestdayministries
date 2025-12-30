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
    images?: string[];
    vendors: {
      id: string;
      business_name: string;
      stripe_account_id: string | null;
      stripe_charges_enabled: boolean;
      is_house_vendor: boolean;
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
          images,
          vendors (
            id,
            business_name,
            stripe_account_id,
            stripe_charges_enabled,
            is_house_vendor
          )
        )
      `)
      .eq("user_id", user.id);

    if (cartError) throw new Error(`Failed to fetch cart: ${cartError.message}`);
    if (!cartItems || cartItems.length === 0) throw new Error("Cart is empty");
    logStep("Cart items fetched", { count: cartItems.length });

    // Type assertion for nested data
    const typedCartItems = cartItems as unknown as CartItem[];

    // Separate house vendor (official merch) from regular vendor products
    const officialMerchItems: CartItem[] = [];
    const vendorItems: CartItem[] = [];

    for (const item of typedCartItems) {
      if (!item.products?.vendors) {
        throw new Error(`Product "${item.products?.name || 'Unknown'}" has no vendor assigned`);
      }
      
      if (item.products.vendors.is_house_vendor) {
        // Official merch - 100% goes to platform
        officialMerchItems.push(item);
      } else {
        // Regular vendor product - verify Stripe setup
        if (!item.products.vendors.stripe_account_id) {
          throw new Error(`Vendor "${item.products.vendors.business_name || 'Unknown'}" has not completed Stripe setup`);
        }
        if (!item.products.vendors.stripe_charges_enabled) {
          throw new Error(`Vendor "${item.products.vendors.business_name || 'Unknown'}" cannot receive payments yet`);
        }
        vendorItems.push(item);
      }
    }

    logStep("Items categorized", { 
      officialMerchCount: officialMerchItems.length, 
      vendorItemsCount: vendorItems.length 
    });

    // Get commission percentage (only applies to regular vendor items)
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
      .eq("setting_key", "marketplace_stripe_mode")
      .single();

    const stripeMode = appSettings?.setting_value === "live" ? "live" : "test";
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE") 
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    
    if (!stripeKey) throw new Error(`Stripe ${stripeMode} key not configured`);
    logStep("Stripe mode determined", { stripeMode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate totals - group by vendor
    const groupTotals = new Map<string, { 
      groupKey: string;
      vendorId: string;
      stripeAccountId: string | null;
      isHouseVendor: boolean;
      subtotal: number;
      platformFee: number;
      vendorPayout: number;
      shippingFee: number;
      items: CartItem[];
    }>();

    // Process all items (both official merch and vendor items)
    for (const item of typedCartItems) {
      const vendorId = item.products.vendor_id;
      const isHouseVendor = item.products.vendors.is_house_vendor;
      const stripeAccountId = item.products.vendors.stripe_account_id;
      const itemTotal = Math.round(item.products.price * 100) * item.quantity;
      
      if (!groupTotals.has(vendorId)) {
        groupTotals.set(vendorId, {
          groupKey: vendorId,
          vendorId,
          stripeAccountId,
          isHouseVendor,
          subtotal: 0,
          platformFee: 0,
          vendorPayout: 0,
          shippingFee: 0,
          items: []
        });
      }
      
      const groupData = groupTotals.get(vendorId)!;
      groupData.subtotal += itemTotal;
      groupData.items.push(item);
    }

    // Calculate fees and shipping for each vendor group
    for (const groupData of groupTotals.values()) {
      // Free shipping if vendor subtotal >= $35, otherwise $6.99
      groupData.shippingFee = groupData.subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_RATE_CENTS;
      
      if (groupData.isHouseVendor) {
        // Official merch: 100% goes to platform
        groupData.platformFee = groupData.subtotal;
        groupData.vendorPayout = 0;
      } else {
        // Regular vendor: commission split
        groupData.platformFee = Math.round(groupData.subtotal * (commissionPercentage / 100));
        groupData.vendorPayout = groupData.subtotal - groupData.platformFee;
      }
    }

    const totalSubtotal = Array.from(groupTotals.values()).reduce((sum, v) => sum + v.subtotal, 0);
    const totalShipping = Array.from(groupTotals.values()).reduce((sum, v) => sum + v.shippingFee, 0);
    const totalAmount = totalSubtotal + totalShipping;
    const totalPlatformFee = Array.from(groupTotals.values()).reduce((sum, v) => sum + v.platformFee, 0);
    const hasOfficialMerch = Array.from(groupTotals.values()).some(g => g.isHouseVendor);
    
    logStep("Totals calculated", { 
      totalSubtotal, 
      totalShipping, 
      totalAmount, 
      totalPlatformFee, 
      groupCount: groupTotals.size,
      hasOfficialMerch
    });

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
          images: item.products.images?.length ? [item.products.images[0]] : [],
        },
        unit_amount: Math.round(item.products.price * 100),
      },
      quantity: item.quantity,
    }));

    // Add shipping line items for each group that has shipping
    const shippingLineItems: typeof productLineItems = [];
    for (const groupData of groupTotals.values()) {
      if (groupData.shippingFee > 0) {
        const groupName = groupData.items[0]?.products?.vendors?.business_name || 'Vendor';
        shippingLineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `Shipping (${groupName})`,
              images: [],
            },
            unit_amount: groupData.shippingFee,
          },
          quantity: 1,
        });
      }
    }

    const allLineItems = [...productLineItems, ...shippingLineItems];

    // Create order record
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        total_amount: totalAmount / 100,
        stripe_mode: stripeMode,
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Order created", { orderId: order.id });

    // Create order items with fee breakdown
    const orderItems = typedCartItems.map(item => {
      const groupData = groupTotals.get(item.products.vendor_id)!;
      const itemTotalCents = Math.round(item.products.price * 100) * item.quantity;
      const itemFeeRatio = itemTotalCents / groupData.subtotal;
      
      return {
        order_id: order.id,
        product_id: item.product_id,
        vendor_id: item.products.vendor_id,
        quantity: item.quantity,
        price_at_time: item.products.price,
        platform_fee: Math.round(groupData.platformFee * itemFeeRatio) / 100,
        vendor_payout: Math.round(groupData.vendorPayout * itemFeeRatio) / 100,
      };
    });

    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);
    logStep("Order items created", { count: orderItems.length });

    const origin = req.headers.get("origin") || "https://lovable.dev";

    const regularVendorCount = Array.from(groupTotals.values()).filter(g => !g.isHouseVendor).length;

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: allLineItems,
      mode: "payment",
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/marketplace?canceled=true`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      metadata: {
        order_id: order.id,
        user_id: user.id,
        stripe_mode: stripeMode,
        vendor_count: regularVendorCount.toString(),
        has_official_merch: hasOfficialMerch.toString(),
        total_shipping_cents: totalShipping.toString(),
      },
    };

    logStep("Checkout configured", { 
      regularVendorCount,
      hasOfficialMerch
    });

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
