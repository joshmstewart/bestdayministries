import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[check-printify-status] ${step}${detailsStr}`);
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
    logStep('Using Printify shop', { shopId });

    // Get all order items with pending Printify orders
    const { data: pendingItems, error: itemsError } = await supabaseClient
      .from('order_items')
      .select('id, printify_order_id, printify_status, fulfillment_status, order_id')
      .not('printify_order_id', 'is', null)
      .not('fulfillment_status', 'eq', 'shipped')
      .not('fulfillment_status', 'eq', 'delivered')
      .not('fulfillment_status', 'eq', 'cancelled');

    if (itemsError) {
      throw new Error('Failed to fetch pending order items');
    }

    if (!pendingItems || pendingItems.length === 0) {
      logStep('No pending Printify orders to check');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending orders',
          updated: 0,
          emailsSent: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Checking pending items', { count: pendingItems.length });

    // Get unique Printify order IDs
    const uniqueOrderIds = [...new Set(pendingItems.map(item => item.printify_order_id))];
    let updatedCount = 0;
    let emailsSent = 0;

    for (const printifyOrderId of uniqueOrderIds) {
      try {
        logStep('Checking Printify order', { printifyOrderId });

        const orderResponse = await fetch(
          `https://api.printify.com/v1/shops/${shopId}/orders/${printifyOrderId}.json`,
          { headers: { 'Authorization': `Bearer ${printifyApiKey}` } }
        );

        if (!orderResponse.ok) {
          logStep('Failed to fetch Printify order', { printifyOrderId, status: orderResponse.status });
          continue;
        }

        const printifyOrder = await orderResponse.json();
        const status = printifyOrder.status;
        const shipments = printifyOrder.shipments || [];

        logStep('Printify order status', { printifyOrderId, status, shipmentsCount: shipments.length });

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
            fulfillmentStatus = 'in_production';
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
        const previousStatuses = itemsToUpdate.map(item => item.fulfillment_status);
        const wasNotShipped = previousStatuses.every(s => s !== 'shipped' && s !== 'delivered');

        for (const item of itemsToUpdate) {
          const updateData: Record<string, any> = {
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
            logStep('Failed to update order item', { itemId: item.id, error: updateError });
          } else {
            updatedCount++;
            logStep('Updated order item', { itemId: item.id, status: mappedStatus });
          }
        }

        // Send shipped email if status changed to shipped and we have tracking
        if (fulfillmentStatus === 'shipped' && wasNotShipped && trackingNumber) {
          const orderId = itemsToUpdate[0]?.order_id;
          if (orderId) {
            try {
              const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
              const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
              
              const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-shipped`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  orderId,
                  trackingNumber,
                  trackingUrl: trackingUrl || `https://track.aftership.com/${carrier}/${trackingNumber}`,
                  carrier
                }),
              });

              const emailResult = await emailResponse.json();
              logStep('Shipped email triggered', { orderId, result: emailResult });
              emailsSent++;
            } catch (emailError) {
              logStep('Error sending shipped email', { orderId, error: emailError });
            }
          }
        }

      } catch (orderError) {
        logStep('Error processing Printify order', { printifyOrderId, error: orderError });
      }
    }

    logStep('Status check complete', { updated: updatedCount, emailsSent });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked ${uniqueOrderIds.length} orders`,
        updated: updatedCount,
        emailsSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[check-printify-status] Error:', error);
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