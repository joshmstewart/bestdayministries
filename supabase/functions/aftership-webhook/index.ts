import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for AfterShip webhook payload
const aftershipWebhookSchema = z.object({
  msg: z.object({
    tracking_number: z.string().min(1, "Tracking number is required").max(100),
    tag: z.enum(['Delivered', 'InTransit', 'OutForDelivery', 'Exception', 'Expired', 'Pending', 'InfoReceived', 'AttemptFail', 'AvailableForPickup']).optional(),
    slug: z.string().optional(),
  }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    console.log('[aftership-webhook] Received webhook:', JSON.stringify(requestData, null, 2));
    
    // Validate webhook payload structure
    const validationResult = aftershipWebhookSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error('[aftership-webhook] Invalid webhook payload:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid webhook payload',
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { msg } = validationResult.data;
    const trackingNumber = msg.tracking_number;
    const tag = msg.tag;

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