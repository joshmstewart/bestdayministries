import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shipping constants
const FLAT_SHIPPING_RATE_CENTS = 699; // $6.99
const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 3500; // $35.00 default

// Coffee vendor ID - house vendor for Best Day Ever Coffee
const COFFEE_VENDOR_ID = "f8c7d9e6-5a4b-3c2d-1e0f-9a8b7c6d5e4f";

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
    variant_info?: { variant?: string; variantId?: number } | null;
    vendors: {
      id: string;
      business_name: string;
      stripe_account_id: string | null;
      stripe_charges_enabled: boolean;
      is_house_vendor: boolean;
      free_shipping_threshold: number | null;
    };
  };
}

interface CoffeeCartItem {
  id: string;
  coffee_product_id: string;
  quantity: number;
  tier_quantity: number;
  unit_price: number;
  coffee_products: {
    id: string;
    name: string;
    image_url: string | null;
    shipstation_sku: string | null;
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

    // Parse request body for guest checkout and calculated shipping
    const body = await req.json().catch(() => ({}));
    const guestSessionId = body.session_id;
    const calculatedShipping = body.calculated_shipping as Array<{
      vendor_id: string;
      shipping_cents: number;
      shipping_method: string;
      service_name?: string;
    }> | undefined;
    
    if (calculatedShipping) {
      logStep("Using pre-calculated shipping rates", { vendorCount: calculatedShipping.length });
    }

    // Try to authenticate user (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    let customerEmail = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
      customerEmail = user?.email;
      logStep("User authenticated", { userId: user?.id, email: customerEmail });
    }

    // Determine cart filter
    let cartQuery = supabaseClient
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
            is_house_vendor,
            free_shipping_threshold
          )
        )
      `)
      .not("product_id", "is", null);

    if (user) {
      cartQuery = cartQuery.eq("user_id", user.id);
    } else if (guestSessionId) {
      cartQuery = cartQuery.eq("session_id", guestSessionId);
    } else {
      throw new Error("Authentication or session ID required");
    }

    const { data: cartItems, error: cartError } = await cartQuery;

    if (cartError) throw new Error(`Failed to fetch cart: ${cartError.message}`);
    
    // Type assertion for nested data
    const typedCartItems = (cartItems || []) as unknown as CartItem[];

    // Query coffee items from cart
    let coffeeCartQuery = supabaseClient
      .from("shopping_cart")
      .select(`
        id,
        coffee_product_id,
        quantity,
        tier_quantity,
        unit_price,
        coffee_products (
          id,
          name,
          image_url,
          shipstation_sku
        )
      `)
      .not("coffee_product_id", "is", null);

    if (user) {
      coffeeCartQuery = coffeeCartQuery.eq("user_id", user.id);
    } else if (guestSessionId) {
      coffeeCartQuery = coffeeCartQuery.eq("session_id", guestSessionId);
    }

    const { data: coffeeCartItems, error: coffeeCartError } = await coffeeCartQuery;
    if (coffeeCartError) throw new Error(`Failed to fetch coffee cart: ${coffeeCartError.message}`);
    
    const typedCoffeeItems = (coffeeCartItems || []) as unknown as CoffeeCartItem[];
    
    logStep("Cart items fetched", { 
      productCount: typedCartItems.length, 
      coffeeCount: typedCoffeeItems.length,
      isGuest: !user 
    });

    if (typedCartItems.length === 0 && typedCoffeeItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // INVENTORY CHECK: Verify all items have sufficient stock before proceeding
    const inventoryIssues: string[] = [];
    for (const item of typedCartItems) {
      // Fetch current inventory for each product
      const { data: productData, error: productError } = await supabaseClient
        .from("products")
        .select("id, name, inventory_count, is_printify_product")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        inventoryIssues.push(`Could not verify inventory for "${item.products?.name || 'Unknown product'}"`);
        continue;
      }

      // Skip Printify products (they have unlimited inventory managed by Printify)
      if (productData.is_printify_product) {
        continue;
      }

      // Check if requested quantity exceeds available inventory
      if (productData.inventory_count < item.quantity) {
        if (productData.inventory_count === 0) {
          inventoryIssues.push(`"${productData.name}" is out of stock`);
        } else {
          inventoryIssues.push(`Only ${productData.inventory_count} of "${productData.name}" available (you requested ${item.quantity})`);
        }
      }
    }

    if (inventoryIssues.length > 0) {
      logStep("Inventory check failed", { issues: inventoryIssues });
      throw new Error(`Inventory issues: ${inventoryIssues.join("; ")}`);
    }

    logStep("Inventory check passed");

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
      vendorItemsCount: vendorItems.length,
      coffeeItemsCount: typedCoffeeItems.length
    });

    // Calculate coffee subtotal for grouping
    let coffeeSubtotalCents = 0;
    for (const coffeeItem of typedCoffeeItems) {
      coffeeSubtotalCents += Math.round(coffeeItem.unit_price * 100) * coffeeItem.quantity;
    }

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
      ? Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_LIVE") 
      : Deno.env.get("MARKETPLACE_STRIPE_SECRET_KEY_TEST");
    
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
      freeShippingThresholdCents: number;
    }>();

    // Process all items (both official merch and vendor items)
    for (const item of typedCartItems) {
      const vendorId = item.products.vendor_id;
      const isHouseVendor = item.products.vendors.is_house_vendor;
      const stripeAccountId = item.products.vendors.stripe_account_id;
      const itemTotal = Math.round(item.products.price * 100) * item.quantity;
      
      // Get vendor's custom free shipping threshold (in cents), or use default
      const vendorThreshold = item.products.vendors.free_shipping_threshold;
      const freeShippingThresholdCents = vendorThreshold != null 
        ? Math.round(vendorThreshold * 100) 
        : DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS;
      
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
          items: [],
          freeShippingThresholdCents
        });
      }
      
      const groupData = groupTotals.get(vendorId)!;
      groupData.subtotal += itemTotal;
      groupData.items.push(item);
    }

    // Add coffee vendor group if there are coffee items
    if (typedCoffeeItems.length > 0) {
      // Get coffee shipping settings for threshold
      const { data: coffeeShippingSettings } = await supabaseClient
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "coffee_shipping_settings")
        .single();
      
      const coffeeSettings = coffeeShippingSettings?.setting_value as any;
      const coffeeFreeThreshold = coffeeSettings?.free_shipping_threshold 
        ? Math.round(coffeeSettings.free_shipping_threshold * 100)
        : DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS;
      
      groupTotals.set(COFFEE_VENDOR_ID, {
        groupKey: COFFEE_VENDOR_ID,
        vendorId: COFFEE_VENDOR_ID,
        stripeAccountId: null, // House vendor
        isHouseVendor: true,
        subtotal: coffeeSubtotalCents,
        platformFee: coffeeSubtotalCents, // 100% to platform
        vendorPayout: 0,
        shippingFee: 0, // Will be calculated below
        items: [], // Coffee items tracked separately
        freeShippingThresholdCents: coffeeFreeThreshold
      });
    }

    // Calculate fees and shipping for each vendor group
    for (const groupData of groupTotals.values()) {
      // Check if we have pre-calculated shipping for this vendor
      const calculatedRate = calculatedShipping?.find(cs => cs.vendor_id === groupData.vendorId);
      
      if (calculatedRate) {
        // Use pre-calculated shipping rate from EasyPost
        groupData.shippingFee = calculatedRate.shipping_cents;
        logStep("Using calculated shipping for vendor", { 
          vendorId: groupData.vendorId, 
          shippingCents: calculatedRate.shipping_cents,
          method: calculatedRate.shipping_method
        });
      } else {
        // Fall back to flat rate: free if subtotal >= threshold, otherwise $6.99
        groupData.shippingFee = groupData.subtotal >= groupData.freeShippingThresholdCents ? 0 : FLAT_SHIPPING_RATE_CENTS;
      }
      
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
    const totalPlatformFee = Array.from(groupTotals.values()).reduce((sum, v) => sum + v.platformFee, 0);
    const hasOfficialMerch = Array.from(groupTotals.values()).some(g => g.isHouseVendor);
    const hasCoffee = typedCoffeeItems.length > 0;
    
    // Calculate Stripe processing fee to pass to customer
    // Stripe charges 2.9% + $0.30 per transaction
    // To receive X after fees: charge = (X + 0.30) / 0.971
    const baseAmount = totalSubtotal + totalShipping;
    const processingFeeCents = Math.ceil((baseAmount + 30) / 0.971) - baseAmount;
    const totalAmount = baseAmount + processingFeeCents;
    
    logStep("Totals calculated", { 
      totalSubtotal, 
      totalShipping, 
      processingFeeCents,
      totalAmount, 
      totalPlatformFee, 
      groupCount: groupTotals.size,
      hasOfficialMerch,
      hasCoffee
    });

    // Check or create Stripe customer (only if we have an email)
    const effectiveEmail = customerEmail || (user?.email);
    let customerId: string | undefined;
    
    if (effectiveEmail) {
      const customers = await stripe.customers.list({ email: effectiveEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      }
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

    // Create line items for coffee products
    const coffeeLineItems = typedCoffeeItems.map(item => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${item.coffee_products.name} (${item.tier_quantity}-pack)`,
          images: item.coffee_products.image_url ? [item.coffee_products.image_url] : [],
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    // Add processing fee as a separate line item with explanation
    const processingFeeLineItem = {
      price_data: {
        currency: "usd",
        product_data: {
          name: "Processing Fee",
          description: "Covers secure payment processing costs. This fee ensures vendors receive their full earnings.",
        },
        unit_amount: processingFeeCents,
      },
      quantity: 1,
    };

    // Note: Shipping is handled via shipping_options, not line items
    const allLineItems = [...productLineItems, ...coffeeLineItems, processingFeeLineItem];

    // Create order record - use customer_id for authenticated users (matches OrderHistory.tsx)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        // CRITICAL: Set customer_id for authenticated users - this is what OrderHistory uses
        customer_id: user?.id || null,
        // Also set user_id for backward compatibility
        user_id: user?.id || null,
        customer_email: effectiveEmail,
        status: "pending",
        total_amount: totalAmount / 100,
        stripe_mode: stripeMode,
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Order created", { orderId: order.id, customerId: order.customer_id, userId: order.user_id });

    // Create order items with fee breakdown (regular products)
    const orderItems = typedCartItems.map(item => {
      const groupData = groupTotals.get(item.products.vendor_id)!;
      const itemTotalCents = Math.round(item.products.price * 100) * item.quantity;
      const itemFeeRatio = itemTotalCents / groupData.subtotal;
      
      return {
        order_id: order.id,
        product_id: item.product_id,
        vendor_id: item.products.vendor_id,
        quantity: item.quantity,
        price_at_purchase: item.products.price,
        platform_fee: Math.round(groupData.platformFee * itemFeeRatio) / 100,
        vendor_payout: Math.round(groupData.vendorPayout * itemFeeRatio) / 100,
      };
    });

    // Create order items for coffee products (use coffee_product_id, not product_id)
    const coffeeOrderItems = typedCoffeeItems.map(item => ({
      order_id: order.id,
      coffee_product_id: item.coffee_product_id,
      vendor_id: COFFEE_VENDOR_ID,
      quantity: item.quantity,
      price_at_purchase: item.unit_price,
      platform_fee: item.unit_price * item.quantity, // 100% to platform
      vendor_payout: 0,
    }));

    // Insert all order items
    const allOrderItems = [...orderItems, ...coffeeOrderItems];
    
    if (allOrderItems.length > 0) {
      const { error: itemsError } = await supabaseClient
        .from("order_items")
        .insert(allOrderItems);

      if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);
    }
    
    logStep("Order items created", { 
      productCount: orderItems.length, 
      coffeeCount: coffeeOrderItems.length 
    });

    const origin = req.headers.get("origin") || "https://lovable.dev";
    logStep("Using origin for redirect", { origin });

    const regularVendorCount = Array.from(groupTotals.values()).filter(g => !g.isHouseVendor).length;

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : effectiveEmail,
      // Required for automatic_tax with existing customers - save shipping to customer
      customer_update: customerId ? {
        shipping: 'auto',
      } : undefined,
      line_items: allLineItems,
      mode: "payment",
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/marketplace?canceled=true`,
      // Enable automatic tax calculation for marketplace sales
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: totalShipping,
              currency: 'usd',
            },
            display_name: totalShipping === 0 ? 'Free shipping' : 'Standard shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      metadata: {
        order_id: order.id,
        user_id: user?.id || 'guest',
        stripe_mode: stripeMode,
        vendor_count: regularVendorCount.toString(),
        has_official_merch: hasOfficialMerch.toString(),
        total_shipping_cents: totalShipping.toString(),
      },
    };

    logStep("Checkout configured", { 
      regularVendorCount,
      hasOfficialMerch,
      successUrl: sessionConfig.success_url,
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
