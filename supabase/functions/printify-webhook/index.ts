import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders as sharedCorsHeaders } from '../_shared/corsHeaders.ts';
import { logProviderVerification, verifyProviderSignature } from '../_shared/webhookVerification.ts';

const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Headers': `${sharedCorsHeaders['Access-Control-Allow-Headers']}, x-pfy-signature`,
};

const logStep = (step: string) => {
  console.log(`[printify-webhook] ${step}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = new Uint8Array(await req.arrayBuffer());
    const outcome = verifyProviderSignature(
      'printify', rawBody, req.headers.get('X-Pfy-Signature'), Deno.env.get('PRINTIFY_WEBHOOK_SECRET'),
    );
    logProviderVerification('printify', outcome);
    // ENFORCED: reject anything without a valid signature, and fail closed when
    // PRINTIFY_WEBHOOK_SECRET is not configured (outcome === 'missing-config').
    if (outcome !== 'pass') {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    const payload = JSON.parse(new TextDecoder().decode(rawBody));

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
        logStep('No shipment data in webhook');
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const trackingNumber = shipment.tracking_number;
      const carrier = shipment.carrier || 'unknown';
      const trackingUrl = shipment.tracking_url || `https://track.aftership.com/${carrier}/${trackingNumber}`;

      logStep('Processing shipment');

      // Find order by printify_order_id in order_items
      const { data: orderItems, error: findError } = await supabaseClient
        .from('order_items')
        .select('id, order_id')
        .eq('printify_order_id', printifyOrderId);

      if (findError || !orderItems?.length) {
        logStep('Order not found for Printify ID');
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
        logStep('Error updating order items');
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

        await emailResponse.json();
        logStep('Shipped email triggered');
      } catch (emailError) {
        logStep('Error sending shipped email');
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
          logStep('Error updating delivery status');
        } else {
          logStep('Order marked as delivered');
        }
      }
    }

    // Log other webhook types for debugging
    logStep('Webhook processed');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[printify-webhook] processing failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
