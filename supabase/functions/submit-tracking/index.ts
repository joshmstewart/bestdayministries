import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[submit-tracking] ${step}${detailsStr}`);
};

// Helper to trigger vendor payout transfer
async function triggerVendorTransfer(orderItemId: string): Promise<{ success: boolean; transferId?: string; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    logStep('Triggering vendor transfer', { orderItemId });
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-vendor-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ orderItemId }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      logStep('Vendor transfer failed', { error: result.error });
      return { success: false, error: result.error };
    }

    logStep('Vendor transfer successful', { transferId: result.transferId });
    return { success: true, transferId: result.transferId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logStep('Vendor transfer exception', { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

// Helper to send order shipped email to customer
async function sendShippedEmail(orderId: string, trackingNumber: string, trackingUrl: string, carrier: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    logStep('Sending shipped email', { orderId, trackingNumber, carrier });
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-order-shipped`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ orderId, trackingNumber, trackingUrl, carrier }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      logStep('Shipped email failed', { error: result.error });
      return { success: false, error: result.error };
    }

    logStep('Shipped email sent successfully', { emailId: result.emailId });
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logStep('Shipped email exception', { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderItemId, trackingNumber, carrier } = await req.json();

    if (!orderItemId || !trackingNumber || !carrier) {
      throw new Error('Missing required fields: orderItemId, trackingNumber, carrier');
    }

    logStep('Processing', { orderItemId, trackingNumber, carrier });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Test tracking number for practice - bypasses AfterShip API
    const TEST_TRACKING_NUMBER = '4242424242424242';
    const isTestTracking = trackingNumber === TEST_TRACKING_NUMBER;
    
    let aftershipId = null;
    
    if (isTestTracking) {
      logStep('Using test tracking number - skipping AfterShip API');
      aftershipId = 'test-tracking-id';
    } else {
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
            slug: carrier,
          }
        })
      });

      const aftershipData = await aftershipResponse.json();

      if (!aftershipResponse.ok) {
        logStep('AfterShip error', aftershipData);
        throw new Error(`AfterShip API error: ${aftershipData.meta?.message || 'Unknown error'}`);
      }

      aftershipId = aftershipData.data?.tracking?.id;
      logStep('AfterShip tracking created', { aftershipId });
    }

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

    logStep('Order item updated successfully');

    // Get the order ID for this item to send email
    const { data: orderItem, error: orderItemError } = await supabaseClient
      .from('order_items')
      .select('order_id')
      .eq('id', orderItemId)
      .single();

    if (orderItemError) {
      logStep('Failed to get order ID for email', { error: orderItemError.message });
    }

    // Trigger vendor payout transfer
    const transferResult = await triggerVendorTransfer(orderItemId);

    // Send shipped email to customer (don't fail the request if email fails)
    let emailResult: { success: boolean; error?: string } = { success: false, error: 'Order ID not found' };
    if (orderItem?.order_id) {
      emailResult = await sendShippedEmail(orderItem.order_id, trackingNumber, trackingUrl, carrier);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        trackingUrl,
        aftershipId,
        transfer: transferResult,
        email: emailResult,
        isTestTracking
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