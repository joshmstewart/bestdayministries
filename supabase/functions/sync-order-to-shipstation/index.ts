import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Coffee vendor ID - house vendor for Best Day Ever Coffee
const COFFEE_VENDOR_ID = "f8c7d9e6-5a4b-3c2d-1e0f-9a8b7c6d5e4f";
const DEFAULT_COFFEE_WEIGHT_OZ = 16; // Default 1lb per coffee product

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-ORDER-SHIPSTATION] ${step}${detailsStr}`);
};

interface OrderItemWithProduct {
  id: string;
  order_id: string;
  product_id: string | null;
  coffee_product_id: string | null;
  vendor_id: string;
  quantity: number;
  price_at_purchase: number;
  shipstation_order_id: string | null;
  // Joined product data (nullable)
  products?: {
    id: string;
    name: string;
    sku?: string;
    weight?: number;
  } | null;
  // Joined coffee product data (nullable)
  coffee_products?: {
    id: string;
    name: string;
    shipstation_sku?: string;
  } | null;
}

interface Order {
  id: string;
  customer_email: string;
  shipping_address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  created_at: string;
  total_amount: number;
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

    // Check for ShipStation API credentials
    const apiKey = Deno.env.get("SHIPSTATION_API_KEY");
    const apiSecret = Deno.env.get("SHIPSTATION_API_SECRET");

    if (!apiKey || !apiSecret) {
      logStep("ShipStation credentials not configured");
      return new Response(
        JSON.stringify({ 
          error: "ShipStation API credentials not configured",
          message: "Please add SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET secrets" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { orderId, vendorId } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Fetching order", { orderId, vendorId });

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (!order.shipping_address) {
      return new Response(
        JSON.stringify({ error: "Order has no shipping address" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch order items - join both products and coffee_products tables
    let itemsQuery = supabaseClient
      .from("order_items")
      .select(`
        id,
        order_id,
        product_id,
        coffee_product_id,
        vendor_id,
        quantity,
        price_at_purchase,
        shipstation_order_id,
        products (
          id,
          name,
          sku,
          weight
        ),
        coffee_products (
          id,
          name,
          shipstation_sku
        )
      `)
      .eq("order_id", orderId)
      .is("shipstation_order_id", null); // Only items not yet synced

    if (vendorId) {
      itemsQuery = itemsQuery.eq("vendor_id", vendorId);
    }

    const { data: items, error: itemsError } = await itemsQuery;

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch order items", details: itemsError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Type assertion
    const typedItems = (items || []) as unknown as OrderItemWithProduct[];

    if (typedItems.length === 0) {
      logStep("No unsynced items found");
      return new Response(
        JSON.stringify({ message: "No items to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Found items to sync", { count: typedItems.length });

    // Group items by vendor (each vendor gets their own ShipStation order)
    const itemsByVendor = new Map<string, OrderItemWithProduct[]>();
    for (const item of typedItems) {
      const vid = item.vendor_id;
      if (!itemsByVendor.has(vid)) {
        itemsByVendor.set(vid, []);
      }
      itemsByVendor.get(vid)!.push(item);
    }

    const typedOrder = order as Order;
    const results: Array<{ vendorId: string; shipstationOrderId?: number; error?: string }> = [];
    const authHeader = "Basic " + btoa(`${apiKey}:${apiSecret}`);

    for (const [vid, vendorItems] of itemsByVendor) {
      try {
        // Build ShipStation order payload
        const shipstationOrder = {
          orderNumber: `${orderId.slice(0, 8)}-${vid.slice(0, 4)}`,
          orderKey: `${orderId}-${vid}`,
          orderDate: typedOrder.created_at,
          orderStatus: "awaiting_shipment",
          customerEmail: typedOrder.customer_email,
          billTo: {
            name: typedOrder.shipping_address.name,
            street1: typedOrder.shipping_address.line1,
            street2: typedOrder.shipping_address.line2 || "",
            city: typedOrder.shipping_address.city,
            state: typedOrder.shipping_address.state,
            postalCode: typedOrder.shipping_address.postal_code,
            country: typedOrder.shipping_address.country,
          },
          shipTo: {
            name: typedOrder.shipping_address.name,
            street1: typedOrder.shipping_address.line1,
            street2: typedOrder.shipping_address.line2 || "",
            city: typedOrder.shipping_address.city,
            state: typedOrder.shipping_address.state,
            postalCode: typedOrder.shipping_address.postal_code,
            country: typedOrder.shipping_address.country,
          },
          items: vendorItems.map((item) => {
            // Determine if this is a coffee product or regular product
            const isCoffee = item.coffee_product_id !== null;
            
            if (isCoffee && item.coffee_products) {
              // Coffee product - use shipstation_sku from coffee_products
              return {
                sku: item.coffee_products.shipstation_sku || `COFFEE-${(item.coffee_product_id || 'UNKNOWN').slice(0, 8)}`,
                name: item.coffee_products.name || "Coffee Product",
                quantity: item.quantity,
                unitPrice: item.price_at_purchase,
                weight: {
                  value: DEFAULT_COFFEE_WEIGHT_OZ,
                  units: "ounces",
                },
              };
            } else if (item.products) {
              // Regular product
              return {
                sku: item.products.sku || (item.product_id ? item.product_id.slice(0, 8) : "UNKNOWN"),
                name: item.products.name || "Product",
                quantity: item.quantity,
                unitPrice: item.price_at_purchase,
                weight: {
                  value: item.products.weight || 1,
                  units: "ounces",
                },
              };
            } else {
              // Fallback for items without joined data
              return {
                sku: (item.product_id || item.coffee_product_id || "UNKNOWN").slice(0, 8),
                name: "Product",
                quantity: item.quantity,
                unitPrice: item.price_at_purchase,
                weight: {
                  value: 1,
                  units: "ounces",
                },
              };
            }
          }),
          amountPaid: vendorItems.reduce(
            (sum, item) => sum + item.price_at_purchase * item.quantity,
            0
          ),
          internalNotes: `Lovable Order ID: ${orderId}, Vendor ID: ${vid}${vid === COFFEE_VENDOR_ID ? ' (Coffee)' : ''}`,
        };

        logStep("Creating ShipStation order", { vendorId: vid, orderKey: shipstationOrder.orderKey });

        const response = await fetch("https://ssapi.shipstation.com/orders/createorder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(shipstationOrder),
        });

        const result = await response.json();

        if (!response.ok) {
          logStep("ShipStation API error", { vendorId: vid, status: response.status, result });
          results.push({ vendorId: vid, error: result.Message || "API error" });
          continue;
        }

        logStep("ShipStation order created", { vendorId: vid, orderId: result.orderId });

        // Update order items with ShipStation info
        const itemIds = vendorItems.map((item: any) => item.id);
        const { error: updateError } = await supabaseClient
          .from("order_items")
          .update({
            shipstation_order_id: String(result.orderId),
            shipstation_order_key: result.orderKey,
            shipstation_synced_at: new Date().toISOString(),
          })
          .in("id", itemIds);

        if (updateError) {
          logStep("Failed to update order items", { error: updateError.message });
        }

        results.push({ vendorId: vid, shipstationOrderId: result.orderId });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logStep("Error processing vendor", { vendorId: vid, error: errorMessage });
        results.push({ vendorId: vid, error: errorMessage });
      }
    }

    const successCount = results.filter((r) => r.shipstationOrderId).length;
    logStep("Sync complete", { total: results.length, success: successCount });

    return new Response(
      JSON.stringify({
        message: `Synced ${successCount} of ${results.length} vendor orders`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
