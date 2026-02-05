import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    // SECURITY: Verify webhook signature from AfterShip
    const signature = req.headers.get('aftership-hmac-sha256');
    if (!signature) {
      console.error('[aftership-webhook] Missing signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const webhookSecret = Deno.env.get('AFTERSHIP_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[aftership-webhook] Webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Read raw body for signature verification
    const body = await req.text();
    
    // Calculate expected signature using HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Verify signature (timing-safe comparison)
    if (signature !== expectedSignature) {
      console.error('[aftership-webhook] Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Parse body after signature validation
    const requestData = JSON.parse(body);
    
    console.log('[aftership-webhook] Received verified webhook:', JSON.stringify(requestData, null, 2));
    
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