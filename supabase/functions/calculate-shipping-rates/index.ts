import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FLAT_SHIPPING_RATE_CENTS = 699; // $6.99 fallback
const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 3500;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-SHIPPING] ${step}${detailsStr}`);
};

interface ShippingAddress {
  zip: string;
  city?: string;
  state?: string;
  country?: string;
}

interface CartItemWithProduct {
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    vendor_id: string;
    weight_oz?: number;
    vendors: {
      id: string;
      business_name: string;
      shipping_mode: string | null;
      ship_from_zip: string | null;
      ship_from_city: string | null;
      ship_from_state: string | null;
      flat_rate_amount_cents: number | null;
      use_flat_rate_fallback: boolean | null;
      free_shipping_threshold: number | null;
      disable_free_shipping: boolean | null;
    };
  };
}

interface VendorShippingResult {
  vendor_id: string;
  vendor_name: string;
  subtotal_cents: number;
  shipping_cents: number;
  shipping_method: 'calculated' | 'flat' | 'free';
  service_name?: string;
  carrier?: string;
  estimated_days?: number;
  error?: string;
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

    const body = await req.json();
    const { shipping_address, session_id } = body as { 
      shipping_address: ShippingAddress; 
      session_id?: string;
    };

    if (!shipping_address?.zip) {
      throw new Error("Shipping ZIP code is required");
    }

    logStep("Shipping address received", { zip: shipping_address.zip });

    // Try to authenticate user (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    let user = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
      logStep("User authenticated", { userId: user?.id });
    }

    // Build cart query
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
          weight_oz,
          vendors (
            id,
            business_name,
            shipping_mode,
            ship_from_zip,
            ship_from_city,
            ship_from_state,
            flat_rate_amount_cents,
            use_flat_rate_fallback,
            free_shipping_threshold,
            disable_free_shipping
          )
        )
      `);

    if (user) {
      cartQuery = cartQuery.eq("user_id", user.id);
    } else if (session_id) {
      cartQuery = cartQuery.eq("session_id", session_id);
    } else {
      throw new Error("Authentication or session ID required");
    }

    const { data: cartItems, error: cartError } = await cartQuery;

    if (cartError) throw new Error(`Failed to fetch cart: ${cartError.message}`);
    if (!cartItems || cartItems.length === 0) throw new Error("Cart is empty");
    
    const typedCartItems = cartItems as unknown as CartItemWithProduct[];
    logStep("Cart items fetched", { count: typedCartItems.length });

    // Determine Stripe mode for EasyPost key selection
    const { data: appSettings } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "marketplace_stripe_mode")
      .single();

    const stripeMode = appSettings?.setting_value === "live" ? "live" : "test";
    const easyPostKey = stripeMode === "live"
      ? Deno.env.get("EASYPOST_API_KEY_LIVE")
      : Deno.env.get("EASYPOST_API_KEY_TEST");

    logStep("Using mode", { stripeMode, hasEasyPostKey: !!easyPostKey });

    // Group cart items by vendor
    const vendorGroups = new Map<string, {
      vendor: CartItemWithProduct['products']['vendors'];
      items: CartItemWithProduct[];
      subtotal_cents: number;
    }>();

    for (const item of typedCartItems) {
      const vendorId = item.products.vendor_id;
      const itemTotal = Math.round(item.products.price * 100) * item.quantity;

      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, {
          vendor: item.products.vendors,
          items: [],
          subtotal_cents: 0,
        });
      }

      const group = vendorGroups.get(vendorId)!;
      group.items.push(item);
      group.subtotal_cents += itemTotal;
    }

    logStep("Grouped by vendor", { vendorCount: vendorGroups.size });

    // Calculate shipping for each vendor
    const vendorResults: VendorShippingResult[] = [];

    for (const [vendorId, group] of vendorGroups) {
      const vendor = group.vendor;
      const freeShippingThresholdCents = vendor.free_shipping_threshold != null
        ? Math.round(vendor.free_shipping_threshold * 100)
        : DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS;

      // Check if free shipping applies (unless disabled)
      if (!vendor.disable_free_shipping && group.subtotal_cents >= freeShippingThresholdCents) {
        logStep("Free shipping for vendor", { vendorId, subtotal: group.subtotal_cents, threshold: freeShippingThresholdCents });
        vendorResults.push({
          vendor_id: vendorId,
          vendor_name: vendor.business_name,
          subtotal_cents: group.subtotal_cents,
          shipping_cents: 0,
          shipping_method: 'free',
          service_name: 'Free Shipping',
        });
        continue;
      }

      // Check if vendor uses calculated shipping
      if (vendor.shipping_mode === 'calculated' && vendor.ship_from_zip && easyPostKey) {
        try {
          // Calculate total weight for this vendor's items
          let totalWeightOz = 0;
          for (const item of group.items) {
            const weight = item.products.weight_oz || 16; // Default 1 lb if not set
            totalWeightOz += weight * item.quantity;
          }

          logStep("Calculating EasyPost rate", { 
            vendorId, 
            fromZip: vendor.ship_from_zip, 
            toZip: shipping_address.zip,
            weightOz: totalWeightOz 
          });

          // Call EasyPost API
          const easyPostResponse = await fetch("https://api.easypost.com/v2/shipments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${easyPostKey}`,
            },
            body: JSON.stringify({
              shipment: {
                from_address: {
                  zip: vendor.ship_from_zip,
                  city: vendor.ship_from_city || undefined,
                  state: vendor.ship_from_state || undefined,
                  country: "US",
                },
                to_address: {
                  zip: shipping_address.zip,
                  city: shipping_address.city || undefined,
                  state: shipping_address.state || undefined,
                  country: shipping_address.country || "US",
                },
                parcel: {
                  weight: totalWeightOz,
                  // Default small box dimensions
                  length: 10,
                  width: 8,
                  height: 4,
                },
                carrier_accounts: [], // Use account defaults
                carriers: ["USPS"], // Only USPS for now
              },
            }),
          });

          if (!easyPostResponse.ok) {
            const errorText = await easyPostResponse.text();
            throw new Error(`EasyPost API error: ${errorText}`);
          }

          const shipmentData = await easyPostResponse.json();
          const rates = shipmentData.rates || [];

          // Find cheapest USPS rate
          const uspsRates = rates.filter((r: any) => r.carrier === "USPS");
          if (uspsRates.length > 0) {
            // Sort by rate and get cheapest
            uspsRates.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate));
            const cheapestRate = uspsRates[0];
            const rateCents = Math.round(parseFloat(cheapestRate.rate) * 100);

            logStep("EasyPost rate found", { 
              vendorId, 
              service: cheapestRate.service,
              rateCents,
              deliveryDays: cheapestRate.delivery_days
            });

            vendorResults.push({
              vendor_id: vendorId,
              vendor_name: vendor.business_name,
              subtotal_cents: group.subtotal_cents,
              shipping_cents: rateCents,
              shipping_method: 'calculated',
              service_name: cheapestRate.service,
              carrier: cheapestRate.carrier,
              estimated_days: cheapestRate.delivery_days,
            });
            continue;
          } else {
            throw new Error("No USPS rates available");
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logStep("EasyPost calculation failed, using fallback", { vendorId, error: errorMessage });

          // Use flat rate fallback if enabled
          if (vendor.use_flat_rate_fallback) {
            const flatRate = vendor.flat_rate_amount_cents || FLAT_SHIPPING_RATE_CENTS;
            vendorResults.push({
              vendor_id: vendorId,
              vendor_name: vendor.business_name,
              subtotal_cents: group.subtotal_cents,
              shipping_cents: flatRate,
              shipping_method: 'flat',
              service_name: 'Standard Shipping',
              error: `Calculated rate unavailable: ${errorMessage}`,
            });
            continue;
          }
        }
      }

      // Default to flat rate shipping
      const flatRate = vendor.flat_rate_amount_cents || FLAT_SHIPPING_RATE_CENTS;
      logStep("Using flat rate for vendor", { vendorId, flatRate });

      vendorResults.push({
        vendor_id: vendorId,
        vendor_name: vendor.business_name,
        subtotal_cents: group.subtotal_cents,
        shipping_cents: flatRate,
        shipping_method: 'flat',
        service_name: 'Standard Shipping',
      });
    }

    const totalShippingCents = vendorResults.reduce((sum, v) => sum + v.shipping_cents, 0);
    const totalSubtotalCents = vendorResults.reduce((sum, v) => sum + v.subtotal_cents, 0);

    logStep("Calculation complete", { 
      totalShippingCents, 
      totalSubtotalCents,
      vendorCount: vendorResults.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        shipping_total_cents: totalShippingCents,
        subtotal_cents: totalSubtotalCents,
        vendor_shipping: vendorResults,
        requires_calculated_shipping: vendorResults.some(v => v.shipping_method === 'calculated'),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
