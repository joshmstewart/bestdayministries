import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FLAT_SHIPPING_RATE_CENTS = 699; // $6.99 fallback
const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 3500;
const COFFEE_VENDOR_ID = "f8c7d9e6-5a4b-3c2d-1e0f-9a8b7c6d5e4f"; // Best Day Ever Coffee house vendor
const COFFEE_ORIGIN_ZIP = "28036"; // Davidson, NC

// Coffee box configurations based on quantity
// Each 12oz bag weighs ~12oz, box weights are estimated
const COFFEE_BOX_CONFIG = {
  small: { maxBags: 3, dimensions: { length: 6, width: 6, height: 7 }, boxWeightOz: 3.5 },
  medium: { maxBags: 6, dimensions: { length: 10, width: 8, height: 6 }, boxWeightOz: 7.0 },
  large: { maxBags: 9, dimensions: { length: 12, width: 10, height: 6 }, boxWeightOz: 10.0 },
  xlarge: { maxBags: Infinity, dimensions: { length: 16, width: 12, height: 10 }, boxWeightOz: 14.0 },
};
const COFFEE_BAG_WEIGHT_OZ = 12; // Each 12oz bag

interface CoffeeShippingSettings {
  shipping_mode: 'flat' | 'calculated' | null;
  ship_from_zip: string;
  ship_from_city: string;
  ship_from_state: string;
  flat_rate_amount: number | null;
  free_shipping_threshold: number | null;
  disable_free_shipping: boolean;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-SHIPPING] ${step}${detailsStr}`);
};

// Determine box configuration based on total bag count
function getCoffeeBoxConfig(bagCount: number) {
  if (bagCount <= COFFEE_BOX_CONFIG.small.maxBags) return COFFEE_BOX_CONFIG.small;
  if (bagCount <= COFFEE_BOX_CONFIG.medium.maxBags) return COFFEE_BOX_CONFIG.medium;
  if (bagCount <= COFFEE_BOX_CONFIG.large.maxBags) return COFFEE_BOX_CONFIG.large;
  return COFFEE_BOX_CONFIG.xlarge;
}

// Audit log entry interface
interface ShippingLogEntry {
  user_id?: string;
  session_id?: string;
  order_id?: string;
  destination_zip?: string;
  origin_zip?: string;
  items: unknown;
  total_weight_oz?: number;
  box_dimensions?: unknown;
  calculation_source: string;
  carrier?: string;
  service_name?: string;
  decision_reason?: string;
  fallback_used?: boolean;
  fallback_reason?: string;
  rate_cents?: number;
  estimated_days?: number;
  api_request?: unknown;
  api_response?: unknown;
  api_error?: string;
  calculation_time_ms?: number;
}

// Log a shipping calculation to the database
async function logShippingCalculation(
  supabaseClient: any,
  entry: ShippingLogEntry
) {
  try {
    const { error } = await supabaseClient
      .from("shipping_calculation_log")
      .insert(entry as any);
    
    if (error) {
      logStep("Failed to log shipping calculation", { error: error.message });
    }
  } catch (e) {
    logStep("Exception logging shipping calculation", { error: String(e) });
  }
}

interface ShipStationSuccess {
  success: true;
  rateCents: number;
  serviceName: string;
  estimatedDays?: number;
  apiRequest: unknown;
  apiResponse: unknown;
}

interface ShipStationError {
  success: false;
  error: string;
  apiRequest: unknown;
}

// Call ShipStation API to get shipping rates
async function getShipStationRate(
  fromZip: string,
  toZip: string,
  weightOz: number,
  dimensions: { length: number; width: number; height: number },
  carrier: "usps" | "ups",
  apiKey: string,
  apiSecret: string
): Promise<ShipStationSuccess | ShipStationError> {
  const authHeader = "Basic " + btoa(`${apiKey}:${apiSecret}`);
  
  const requestBody = {
    carrierCode: carrier,
    fromPostalCode: fromZip,
    toPostalCode: toZip,
    toCountry: "US",
    weight: {
      value: weightOz,
      units: "ounces",
    },
    dimensions: {
      length: dimensions.length,
      width: dimensions.width,
      height: dimensions.height,
      units: "inches",
    },
    confirmation: "none",
    residential: true,
  };
  
  try {
    const response = await fetch("https://ssapi.shipstation.com/shipments/getrates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("ShipStation API error", { status: response.status, error: errorText });
      return { success: false, error: `HTTP ${response.status}: ${errorText}`, apiRequest: requestBody };
    }

    const rates = await response.json();
    
    if (!rates || rates.length === 0) {
      logStep("No ShipStation rates returned", { carrier });
      return { success: false, error: "No rates returned", apiRequest: requestBody };
    }

    // Sort by price and get cheapest
    rates.sort((a: any, b: any) => a.shipmentCost - b.shipmentCost);
    const cheapest = rates[0];
    
    return {
      success: true,
      rateCents: Math.round(cheapest.shipmentCost * 100),
      serviceName: cheapest.serviceName || `${carrier.toUpperCase()} Shipping`,
      estimatedDays: cheapest.deliveryDays || undefined,
      apiRequest: requestBody,
      apiResponse: rates,
    };
  } catch (error) {
    logStep("ShipStation rate fetch failed", { error: String(error) });
    return { success: false, error: String(error), apiRequest: requestBody };
  }
}

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

interface CoffeeCartItem {
  id: string;
  coffee_product_id: string;
  quantity: number;
  variant_info?: {
    price_per_unit?: number;
  };
  coffee_product?: {
    id: string;
    name: string;
    selling_price: number;
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

    // Build cart query - include BOTH regular products AND coffee products
    let cartQuery = supabaseClient
      .from("shopping_cart")
      .select(`
        id,
        product_id,
        coffee_product_id,
        quantity,
        variant_info,
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
        ),
        coffee_product:coffee_products (
          id,
          name,
          selling_price
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
    
    // Separate regular product items and coffee items
    const regularCartItems = cartItems.filter((item: any) => item.product_id && item.products) as unknown as CartItemWithProduct[];
    const coffeeCartItems = cartItems.filter((item: any) => item.coffee_product_id && item.coffee_product) as unknown as CoffeeCartItem[];
    
    logStep("Cart items fetched", { regularCount: regularCartItems.length, coffeeCount: coffeeCartItems.length });

    // Fetch coffee shipping settings if there are coffee items
    let coffeeShippingSettings: CoffeeShippingSettings | null = null;
    if (coffeeCartItems.length > 0) {
      const { data: coffeeSettings } = await supabaseClient
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "coffee_shipping_settings")
        .maybeSingle();
      
      if (coffeeSettings?.setting_value) {
        coffeeShippingSettings = typeof coffeeSettings.setting_value === 'string'
          ? JSON.parse(coffeeSettings.setting_value)
          : coffeeSettings.setting_value as CoffeeShippingSettings;
        logStep("Coffee shipping settings loaded", coffeeShippingSettings);
      }
    }

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

    // Group REGULAR cart items by vendor
    const vendorGroups = new Map<string, {
      vendor: CartItemWithProduct['products']['vendors'];
      items: CartItemWithProduct[];
      subtotal_cents: number;
    }>();

    for (const item of regularCartItems) {
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

    // ============ COFFEE SHIPPING CALCULATION (via ShipStation) ============
    if (coffeeCartItems.length > 0) {
      // Get ShipStation credentials
      const shipStationApiKey = Deno.env.get("SHIPSTATION_API_KEY");
      const shipStationApiSecret = Deno.env.get("SHIPSTATION_API_SECRET");
      const hasShipStationCredentials = !!shipStationApiKey && !!shipStationApiSecret;
      
      // Calculate coffee totals - count total bags (quantity represents bag count)
      let coffeeSubtotalCents = 0;
      let totalBagCount = 0;
      
      for (const item of coffeeCartItems) {
        const pricePerUnit = (item.variant_info as any)?.price_per_unit ?? item.coffee_product?.selling_price ?? 0;
        coffeeSubtotalCents += Math.round(pricePerUnit * 100) * item.quantity;
        totalBagCount += item.quantity;
      }
      
      // Determine box size and calculate total weight
      const boxConfig = getCoffeeBoxConfig(totalBagCount);
      const totalWeightOz = (totalBagCount * COFFEE_BAG_WEIGHT_OZ) + boxConfig.boxWeightOz;
      
      // Determine carrier: USPS for single bag, UPS for 2+
      const carrier: "usps" | "ups" = totalBagCount === 1 ? "usps" : "ups";
      
      logStep("Coffee items calculated", { 
        coffeeSubtotalCents, 
        totalBagCount, 
        totalWeightOz,
        boxDimensions: boxConfig.dimensions,
        carrier 
      });

      // Check if coffee shipping settings exist
      if (coffeeShippingSettings && coffeeShippingSettings.shipping_mode) {
        const freeThresholdCents = coffeeShippingSettings.free_shipping_threshold != null
          ? Math.round(coffeeShippingSettings.free_shipping_threshold * 100)
          : null;
        
        // Check for free shipping
        if (!coffeeShippingSettings.disable_free_shipping && freeThresholdCents != null && coffeeSubtotalCents >= freeThresholdCents) {
          logStep("Coffee: Free shipping threshold met", { threshold: freeThresholdCents, subtotal: coffeeSubtotalCents });
          vendorResults.push({
            vendor_id: COFFEE_VENDOR_ID,
            vendor_name: "Best Day Ever Coffee",
            subtotal_cents: coffeeSubtotalCents,
            shipping_cents: 0,
            shipping_method: 'free',
            service_name: 'Free Shipping',
          });
        } else if (coffeeShippingSettings.shipping_mode === 'calculated' && hasShipStationCredentials) {
          // Calculate shipping via ShipStation
          const fromZip = coffeeShippingSettings.ship_from_zip || COFFEE_ORIGIN_ZIP;
          const calcStartTime = Date.now();
          
          logStep("Coffee: Calculating ShipStation rate", {
            fromZip,
            toZip: shipping_address.zip,
            totalWeightOz,
            carrier,
            dimensions: boxConfig.dimensions
          });

          const rateResult = await getShipStationRate(
            fromZip,
            shipping_address.zip,
            totalWeightOz,
            boxConfig.dimensions,
            carrier,
            shipStationApiKey!,
            shipStationApiSecret!
          );

          if (rateResult.success) {
            logStep("Coffee: ShipStation rate found", {
              service: rateResult.serviceName,
              rateCents: rateResult.rateCents,
              estimatedDays: rateResult.estimatedDays
            });

            // Log successful calculation
            await logShippingCalculation(supabaseClient, {
              user_id: user?.id,
              session_id: session_id,
              destination_zip: shipping_address.zip,
              origin_zip: fromZip,
              items: coffeeCartItems.map(item => ({
                id: item.id,
                coffee_product_id: item.coffee_product_id,
                quantity: item.quantity,
                is_coffee: true,
              })),
              total_weight_oz: totalWeightOz,
              box_dimensions: boxConfig.dimensions,
              calculation_source: 'shipstation',
              carrier: carrier,
              service_name: rateResult.serviceName,
              decision_reason: `Coffee order: ${totalBagCount} bag(s), carrier=${carrier} (USPS for 1 bag, UPS for 2+)`,
              fallback_used: false,
              rate_cents: rateResult.rateCents,
              estimated_days: rateResult.estimatedDays,
              api_request: rateResult.apiRequest,
              api_response: rateResult.apiResponse,
              calculation_time_ms: Date.now() - calcStartTime,
            });

            vendorResults.push({
              vendor_id: COFFEE_VENDOR_ID,
              vendor_name: "Best Day Ever Coffee",
              subtotal_cents: coffeeSubtotalCents,
              shipping_cents: rateResult.rateCents,
              shipping_method: 'calculated',
              service_name: rateResult.serviceName,
              carrier: carrier.toUpperCase(),
              estimated_days: rateResult.estimatedDays,
            });
          } else {
            // Fallback to flat rate if ShipStation fails
            logStep("Coffee: ShipStation failed, using flat rate fallback", { error: rateResult.error });
            const flatRateCents = coffeeShippingSettings.flat_rate_amount != null
              ? Math.round(coffeeShippingSettings.flat_rate_amount * 100)
              : FLAT_SHIPPING_RATE_CENTS;
            
            // Log fallback calculation
            await logShippingCalculation(supabaseClient, {
              user_id: user?.id,
              session_id: session_id,
              destination_zip: shipping_address.zip,
              origin_zip: fromZip,
              items: coffeeCartItems.map(item => ({
                id: item.id,
                coffee_product_id: item.coffee_product_id,
                quantity: item.quantity,
                is_coffee: true,
              })),
              total_weight_oz: totalWeightOz,
              box_dimensions: boxConfig.dimensions,
              calculation_source: 'flat_rate',
              decision_reason: `Coffee flat rate fallback: ${totalBagCount} bag(s)`,
              fallback_used: true,
              fallback_reason: rateResult.error,
              rate_cents: flatRateCents,
              api_request: rateResult.apiRequest,
              api_error: rateResult.error,
              calculation_time_ms: Date.now() - calcStartTime,
            });

            vendorResults.push({
              vendor_id: COFFEE_VENDOR_ID,
              vendor_name: "Best Day Ever Coffee",
              subtotal_cents: coffeeSubtotalCents,
              shipping_cents: flatRateCents,
              shipping_method: 'flat',
              service_name: 'Standard Shipping',
              error: 'ShipStation rate unavailable, using flat rate',
            });
          }
        } else {
          // Flat rate shipping for coffee (or calculated mode but no credentials)
          const flatRateCents = coffeeShippingSettings.flat_rate_amount != null
            ? Math.round(coffeeShippingSettings.flat_rate_amount * 100)
            : FLAT_SHIPPING_RATE_CENTS;
          
          logStep("Coffee: Using flat rate", { flatRateCents });
          
          vendorResults.push({
            vendor_id: COFFEE_VENDOR_ID,
            vendor_name: "Best Day Ever Coffee",
            subtotal_cents: coffeeSubtotalCents,
            shipping_cents: flatRateCents,
            shipping_method: 'flat',
            service_name: 'Standard Shipping',
          });
        }
      } else {
        // No coffee shipping settings configured - use default flat rate
        logStep("Coffee: No shipping settings, using default flat rate");
        vendorResults.push({
          vendor_id: COFFEE_VENDOR_ID,
          vendor_name: "Best Day Ever Coffee",
          subtotal_cents: coffeeSubtotalCents,
          shipping_cents: FLAT_SHIPPING_RATE_CENTS,
          shipping_method: 'flat',
          service_name: 'Standard Shipping',
        });
      }
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
