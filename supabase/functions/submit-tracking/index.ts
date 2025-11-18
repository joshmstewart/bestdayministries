import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    const { orderItemId, trackingNumber, carrier } = await req.json();

    if (!orderItemId || !trackingNumber || !carrier) {
      throw new Error('Missing required fields: orderItemId, trackingNumber, carrier');
    }

    console.log('[submit-tracking] Processing:', { orderItemId, trackingNumber, carrier });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get AfterShip API key
    const aftershipKey = Deno.env.get('AFTERSHIP_API_KEY');
    if (!aftershipKey) {
      throw new Error('AFTERSHIP_API_KEY not configured');
    }

    // Submit tracking to AfterShip
    const aftershipResponse = await fetch('https://api.aftership.com/v4/trackings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'aftership-api-key': aftershipKey,
      },
      body: JSON.stringify({
        tracking: {
          tracking_number: trackingNumber,
          slug: carrier, // AfterShip carrier slug (e.g., 'usps', 'ups', 'fedex')
        }
      })
    });

    const aftershipData = await aftershipResponse.json();

    if (!aftershipResponse.ok) {
      console.error('[submit-tracking] AfterShip error:', aftershipData);
      throw new Error(`AfterShip API error: ${aftershipData.meta?.message || 'Unknown error'}`);
    }

    console.log('[submit-tracking] AfterShip tracking created:', aftershipData.data?.tracking?.id);

    // Update order_item with tracking URL
    const trackingUrl = `https://track.aftership.com/${carrier}/${trackingNumber}`;
    
    const { error: updateError } = await supabaseClient
      .from('order_items')
      .update({
        tracking_number: trackingNumber,
        carrier: carrier,
        tracking_url: trackingUrl,
        fulfillment_status: 'shipped',
        shipped_at: new Date().toISOString()
      })
      .eq('id', orderItemId);

    if (updateError) throw updateError;

    console.log('[submit-tracking] Order item updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        trackingUrl,
        aftershipId: aftershipData.data?.tracking?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[submit-tracking] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});