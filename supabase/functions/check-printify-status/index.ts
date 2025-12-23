import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const printifyApiKey = Deno.env.get('PRINTIFY_API_KEY');
    if (!printifyApiKey) {
      throw new Error('PRINTIFY_API_KEY not configured');
    }

    // Get shop ID
    const shopsResponse = await fetch('https://api.printify.com/v1/shops.json', {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!shopsResponse.ok) {
      throw new Error('Failed to fetch Printify shops');
    }

    const shops = await shopsResponse.json();
    if (!shops || shops.length === 0) {
      throw new Error('No Printify shop found');
    }

    const shopId = shops[0].id;

    // Get all order items with pending Printify orders
    const { data: pendingItems, error: itemsError } = await supabaseClient
      .from('order_items')
      .select('id, printify_order_id, printify_status, order_id')
      .not('printify_order_id', 'is', null)
      .not('printify_status', 'eq', 'shipped')
      .not('printify_status', 'eq', 'delivered');

    if (itemsError) {
      throw new Error('Failed to fetch pending order items');
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('No pending Printify orders to check');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending orders',
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking', pendingItems.length, 'pending Printify order items');

    // Get unique Printify order IDs
    const uniqueOrderIds = [...new Set(pendingItems.map(item => item.printify_order_id))];
    let updatedCount = 0;

    for (const printifyOrderId of uniqueOrderIds) {
      try {
        console.log('Checking Printify order:', printifyOrderId);

        const orderResponse = await fetch(
          `https://api.printify.com/v1/shops/${shopId}/orders/${printifyOrderId}.json`,
          { headers: { 'Authorization': `Bearer ${printifyApiKey}` } }
        );

        if (!orderResponse.ok) {
          console.error('Failed to fetch Printify order:', printifyOrderId);
          continue;
        }

        const printifyOrder = await orderResponse.json();
        const status = printifyOrder.status;
        const shipments = printifyOrder.shipments || [];

        // Get tracking info from first shipment if available
        let trackingNumber = null;
        let carrier = null;
        let trackingUrl = null;

        if (shipments.length > 0) {
          const shipment = shipments[0];
          trackingNumber = shipment.tracking_number || null;
          carrier = shipment.carrier || null;
          trackingUrl = shipment.tracking_url || null;
        }

        // Map Printify status to our status
        let mappedStatus = 'pending';
        let fulfillmentStatus = 'pending';

        switch (status) {
          case 'pending':
          case 'on-hold':
            mappedStatus = 'pending';
            fulfillmentStatus = 'pending';
            break;
          case 'in-production':
          case 'printing':
            mappedStatus = 'in_production';
            fulfillmentStatus = 'pending';
            break;
          case 'fulfilled':
          case 'shipped':
            mappedStatus = 'shipped';
            fulfillmentStatus = 'shipped';
            break;
          case 'delivered':
            mappedStatus = 'delivered';
            fulfillmentStatus = 'delivered';
            break;
          case 'canceled':
          case 'cancelled':
            mappedStatus = 'cancelled';
            fulfillmentStatus = 'cancelled';
            break;
        }

        // Update all order items with this Printify order ID
        const itemsToUpdate = pendingItems.filter(item => item.printify_order_id === printifyOrderId);

        for (const item of itemsToUpdate) {
          const updateData: any = {
            printify_status: mappedStatus,
            fulfillment_status: fulfillmentStatus,
          };

          if (trackingNumber) {
            updateData.tracking_number = trackingNumber;
            updateData.carrier = carrier;
            updateData.tracking_url = trackingUrl;
          }

          if (fulfillmentStatus === 'shipped') {
            updateData.shipped_at = new Date().toISOString();
          }

          if (fulfillmentStatus === 'delivered') {
            updateData.delivered_at = new Date().toISOString();
          }

          const { error: updateError } = await supabaseClient
            .from('order_items')
            .update(updateData)
            .eq('id', item.id);

          if (updateError) {
            console.error('Failed to update order item:', item.id, updateError);
          } else {
            updatedCount++;
            console.log('Updated order item:', item.id, 'to status:', mappedStatus);
          }
        }

      } catch (orderError) {
        console.error('Error processing Printify order:', printifyOrderId, orderError);
      }
    }

    console.log('Status check complete. Updated', updatedCount, 'items');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked ${uniqueOrderIds.length} orders`,
        updated: updatedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error checking Printify status:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
