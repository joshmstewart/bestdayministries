import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Calculate HMAC-SHA256 signature
async function calculateSignature(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(body);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate webhook signature
    const signature = req.headers.get('aftership-hmac-sha256');
    if (!signature) {
      console.error('[aftership-webhook] Missing signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // 2. Get webhook secret from environment
    const webhookSecret = Deno.env.get('AFTERSHIP_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[aftership-webhook] Webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // 3. Read raw body for signature verification
    const body = await req.text();
    
    // 4. Calculate expected signature
    const expectedSignature = await calculateSignature(webhookSecret, body);

    // 5. Compare signatures (timing-safe comparison)
    if (!timingSafeEqual(signature, expectedSignature)) {
      console.error('[aftership-webhook] Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // 6. Parse body after validation
    const webhookData = JSON.parse(body);
    
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
