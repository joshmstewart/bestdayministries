import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[POLL-SHIPSTATION-STATUS] ${step}${detailsStr}`);
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
    const { limit = 50 } = body;

    // Find order items that have been synced to ShipStation but not yet delivered
    const { data: pendingItems, error: fetchError } = await supabaseClient
      .from("order_items")
      .select(`
        id,
        order_id,
        shipstation_order_id,
        shipstation_order_key,
        fulfillment_status,
        tracking_number
      `)
      .not("shipstation_order_id", "is", null)
      .neq("fulfillment_status", "delivered")
      .order("shipstation_last_checked_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending items", details: fetchError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!pendingItems || pendingItems.length === 0) {
      logStep("No pending items to check");
      return new Response(
        JSON.stringify({ message: "No pending shipments to check", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Found pending items", { count: pendingItems.length });

    // Get unique ShipStation order IDs
    const shipstationOrderIds = [...new Set(pendingItems.map((i) => i.shipstation_order_id))];
    const authHeader = "Basic " + btoa(`${apiKey}:${apiSecret}`);

    const shipmentsByOrderId = new Map<string, any>();

    // Fetch shipment info for each ShipStation order
    for (const ssOrderId of shipstationOrderIds) {
      try {
        // Get shipments for this order
        const shipmentsResponse = await fetch(
          `https://ssapi.shipstation.com/shipments?orderId=${ssOrderId}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        if (shipmentsResponse.ok) {
          const shipmentsData = await shipmentsResponse.json();
          if (shipmentsData.shipments && shipmentsData.shipments.length > 0) {
            // Use the most recent shipment
            const shipment = shipmentsData.shipments[0];
            shipmentsByOrderId.set(ssOrderId!, {
              shipmentId: shipment.shipmentId,
              trackingNumber: shipment.trackingNumber,
              carrierCode: shipment.carrierCode,
              shipDate: shipment.shipDate,
              voided: shipment.voided,
            });
            logStep("Shipment found", { ssOrderId, trackingNumber: shipment.trackingNumber });
          }
        }
      } catch (err) {
        logStep("Error fetching shipment", { ssOrderId, error: String(err) });
      }
    }

    // Update order items with tracking info
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const item of pendingItems) {
      const shipment = shipmentsByOrderId.get(item.shipstation_order_id!);
      
      const updateData: Record<string, any> = {
        shipstation_last_checked_at: now,
      };

      if (shipment && !shipment.voided) {
        updateData.shipstation_shipment_id = String(shipment.shipmentId);
        updateData.tracking_number = shipment.trackingNumber;
        updateData.carrier = mapCarrierCode(shipment.carrierCode);
        updateData.tracking_url = generateTrackingUrl(shipment.carrierCode, shipment.trackingNumber);
        
        if (shipment.shipDate && item.fulfillment_status === "pending") {
          updateData.fulfillment_status = "shipped";
          updateData.shipped_at = shipment.shipDate;
        }
      }

      const { error: updateError } = await supabaseClient
        .from("order_items")
        .update(updateData)
        .eq("id", item.id);

      if (!updateError) {
        updatedCount++;
      } else {
        logStep("Failed to update item", { itemId: item.id, error: updateError.message });
      }
    }

    logStep("Polling complete", { checked: pendingItems.length, updated: updatedCount });

    return new Response(
      JSON.stringify({
        message: `Checked ${pendingItems.length} items, updated ${updatedCount}`,
        checked: pendingItems.length,
        updated: updatedCount,
        shipmentsFound: shipmentsByOrderId.size,
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

// Map ShipStation carrier codes to friendly names
function mapCarrierCode(carrierCode: string): string {
  const carrierMap: Record<string, string> = {
    ups: "UPS",
    usps: "USPS",
    fedex: "FedEx",
    dhl_express: "DHL Express",
    dhl_ecommerce: "DHL eCommerce",
    stamps_com: "USPS",
    endicia: "USPS",
    amazon_buy_shipping: "Amazon",
    ontrac: "OnTrac",
    lasership: "LaserShip",
    spee_dee: "Spee-Dee",
    globegistics: "Globegistics",
    asendia: "Asendia",
    royal_mail: "Royal Mail",
    canada_post: "Canada Post",
    australia_post: "Australia Post",
  };
  return carrierMap[carrierCode?.toLowerCase()] || carrierCode || "Unknown";
}

// Generate tracking URL based on carrier
function generateTrackingUrl(carrierCode: string, trackingNumber: string): string | null {
  if (!trackingNumber) return null;

  const carrier = carrierCode?.toLowerCase();
  const tracking = encodeURIComponent(trackingNumber);

  const urlTemplates: Record<string, string> = {
    ups: `https://www.ups.com/track?tracknum=${tracking}`,
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`,
    stamps_com: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`,
    endicia: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${tracking}`,
    dhl_express: `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`,
    dhl_ecommerce: `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`,
    ontrac: `https://www.ontrac.com/trackingdetail.asp?tracking=${tracking}`,
    lasership: `https://www.lasership.com/track/${tracking}`,
    canada_post: `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${tracking}`,
  };

  return urlTemplates[carrier] || null;
}
