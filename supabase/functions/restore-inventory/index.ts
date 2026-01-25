import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESTORE-INVENTORY] ${step}${detailsStr}`);
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

    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error("order_id is required");
    }

    logStep("Restoring inventory for order", { order_id });

    // Get all order items for this order
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .select(`
        id,
        product_id,
        quantity,
        products (
          id,
          name,
          inventory_count,
          is_printify_product
        )
      `)
      .eq("order_id", order_id);

    if (itemsError) {
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    if (!orderItems || orderItems.length === 0) {
      logStep("No order items found", { order_id });
      return new Response(
        JSON.stringify({ success: true, message: "No items to restore", restored: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Found order items", { count: orderItems.length });

    const restored: Array<{ product_id: string; product_name: string; quantity_restored: number }> = [];

    for (const item of orderItems) {
      const product = (item as any).products;
      
      // Skip Printify products (they have unlimited inventory managed by Printify)
      if (product?.is_printify_product) {
        logStep("Skipping Printify product", { product_id: item.product_id, name: product?.name });
        continue;
      }

      // Restore inventory by incrementing the count
      const { error: updateError } = await supabaseClient
        .from("products")
        .update({ 
          inventory_count: (product?.inventory_count || 0) + item.quantity 
        })
        .eq("id", item.product_id);

      if (updateError) {
        logStep("Failed to restore inventory for product", { 
          product_id: item.product_id, 
          error: updateError.message 
        });
        continue;
      }

      restored.push({
        product_id: item.product_id,
        product_name: product?.name || "Unknown",
        quantity_restored: item.quantity
      });

      logStep("Restored inventory", { 
        product_id: item.product_id, 
        product_name: product?.name,
        quantity_restored: item.quantity,
        new_count: (product?.inventory_count || 0) + item.quantity
      });
    }

    logStep("Inventory restoration complete", { 
      order_id, 
      items_restored: restored.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Restored inventory for ${restored.length} items`,
        restored 
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
