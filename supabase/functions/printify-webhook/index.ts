import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[printify-webhook] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    logStep('Received webhook', { 
      type: payload.type,
      resource: payload.resource?.type,
      id: payload.resource?.id 
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different webhook types
    // Printify sends: order:created, order:updated, order:sent-to-production, 
    // order:shipment:created, order:shipment:delivered, etc.
    
    if (payload.type === 'order:shipment:created' || payload.type === 'order:shipment:sent') {
      const shipment = payload.resource?.data?.shipment || payload.resource?.shipment;
      const printifyOrderId = payload.resource?.id || payload.resource?.data?.id;
      
      if (!shipment || !printifyOrderId) {
        logStep('No shipment data in webhook', payload);
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const trackingNumber = shipment.tracking_number;
      const carrier = shipment.carrier || 'unknown';
      const trackingUrl = shipment.tracking_url || `https://track.aftership.com/${carrier}/${trackingNumber}`;

      logStep('Processing shipment', { printifyOrderId, trackingNumber, carrier });

      // Find order by printify_order_id in order_items
      const { data: orderItems, error: findError } = await supabaseClient
        .from('order_items')
        .select('id, order_id')
        .eq('printify_order_id', printifyOrderId);

      if (findError || !orderItems?.length) {
        logStep('Order not found for Printify ID', { printifyOrderId, error: findError });
        return new Response(JSON.stringify({ success: true, orderNotFound: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const orderId = orderItems[0].order_id;

      // Update all order items with tracking info
      const { error: updateError } = await supabaseClient
        .from('order_items')
        .update({
          tracking_number: trackingNumber,
          carrier: carrier,
          tracking_url: trackingUrl,
          fulfillment_status: 'shipped',
          shipped_at: new Date().toISOString()
        })
        .eq('printify_order_id', printifyOrderId);

      if (updateError) {
        logStep('Error updating order items', { error: updateError });
        throw updateError;
      }

      logStep('Order items updated with tracking');

      // Send shipped notification email
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
            trackingUrl,
            carrier
          }),
        });

        const emailResult = await emailResponse.json();
        logStep('Shipped email triggered', emailResult);
      } catch (emailError) {
        logStep('Error sending shipped email', { error: emailError });
        // Don't fail the webhook for email errors
      }

      return new Response(JSON.stringify({ 
        success: true, 
        orderId,
        trackingNumber,
        carrier 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle delivery confirmation
    if (payload.type === 'order:shipment:delivered') {
      const printifyOrderId = payload.resource?.id || payload.resource?.data?.id;
      
      if (printifyOrderId) {
        const { error: updateError } = await supabaseClient
          .from('order_items')
          .update({
            fulfillment_status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('printify_order_id', printifyOrderId);

        if (updateError) {
          logStep('Error updating delivery status', { error: updateError });
        } else {
          logStep('Order marked as delivered', { printifyOrderId });
        }
      }
    }

    // Log other webhook types for debugging
    logStep('Webhook processed', { type: payload.type });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[printify-webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
