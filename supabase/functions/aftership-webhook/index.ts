import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    
    console.log('[aftership-webhook] Received webhook:', JSON.stringify(webhookData, null, 2));

    const trackingNumber = webhookData.msg?.tracking_number;
    const tag = webhookData.msg?.tag; // AfterShip status: Delivered, InTransit, Exception, etc.

    if (!trackingNumber) {
      console.log('[aftership-webhook] No tracking number in webhook');
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('[aftership-webhook] Processing tracking:', trackingNumber, 'Status:', tag);

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find order_item by tracking number
    const { data: orderItems, error: findError } = await supabaseClient
      .from('order_items')
      .select('id, fulfillment_status')
      .eq('tracking_number', trackingNumber);

    if (findError) {
      console.error('[aftership-webhook] Error finding order item:', findError);
      throw findError;
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('[aftership-webhook] No order item found for tracking:', trackingNumber);
      return new Response(
        JSON.stringify({ received: true, message: 'Tracking number not found in our system' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Update fulfillment status based on AfterShip tag
    if (tag === 'Delivered') {
      for (const item of orderItems) {
        // Only update if not already delivered
        if (item.fulfillment_status !== 'delivered') {
          const { error: updateError } = await supabaseClient
            .from('order_items')
            .update({
              fulfillment_status: 'delivered',
              delivered_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (updateError) {
            console.error('[aftership-webhook] Error updating item:', item.id, updateError);
          } else {
            console.log('[aftership-webhook] Updated item to delivered:', item.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        processed: orderItems.length,
        status: tag 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[aftership-webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});