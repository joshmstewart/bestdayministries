import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[poll-aftership-status] ${step}`, details ? JSON.stringify(details) : '');
};

// AfterShip status to our fulfillment_status mapping
const statusMap: Record<string, string> = {
  'Delivered': 'delivered',
  'InTransit': 'shipped',
  'OutForDelivery': 'shipped',
  'AvailableForPickup': 'shipped',
  'InfoReceived': 'shipped',
  'Pending': 'shipped',
  'AttemptFail': 'shipped',
  'Exception': 'shipped',
  'Expired': 'shipped',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const aftershipApiKey = Deno.env.get('AFTERSHIP_API_KEY');
    if (!aftershipApiKey) {
      logStep('ERROR: AFTERSHIP_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AfterShip API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find all order items with tracking that aren't delivered yet
    const { data: pendingItems, error: fetchError } = await supabaseClient
      .from('order_items')
      .select('id, tracking_number, carrier, fulfillment_status')
      .not('tracking_number', 'is', null)
      .neq('tracking_number', '')
      .neq('fulfillment_status', 'delivered')
      .neq('fulfillment_status', 'completed');

    if (fetchError) {
      logStep('Error fetching pending items', { error: fetchError.message });
      throw fetchError;
    }

    if (!pendingItems || pendingItems.length === 0) {
      logStep('No pending shipments to check');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending shipments', checked: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Found pending shipments', { count: pendingItems.length });

    const results: { id: string; tracking: string; oldStatus: string; newStatus: string | null; error?: string }[] = [];
    let updatedCount = 0;

    for (const item of pendingItems) {
      try {
        // Skip test tracking numbers
        if (item.tracking_number.toLowerCase() === 'test') {
          logStep('Skipping test tracking number', { id: item.id });
          continue;
        }

        // Get tracking info from AfterShip
        const slug = item.carrier?.toLowerCase() || 'auto-detect';
        const trackingUrl = `https://api.aftership.com/v4/trackings/${slug}/${item.tracking_number}`;
        
        logStep('Checking tracking', { tracking: item.tracking_number, carrier: slug });

        const response = await fetch(trackingUrl, {
          method: 'GET',
          headers: {
            'aftership-api-key': aftershipApiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If 404, the tracking might not be in AfterShip yet - try to create it
          if (response.status === 404) {
            logStep('Tracking not found in AfterShip, attempting to create', { tracking: item.tracking_number });
            
            const createResponse = await fetch('https://api.aftership.com/v4/trackings', {
              method: 'POST',
              headers: {
                'aftership-api-key': aftershipApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tracking: {
                  tracking_number: item.tracking_number,
                  slug: slug !== 'auto-detect' ? slug : undefined,
                }
              }),
            });

            if (createResponse.ok) {
              logStep('Created tracking in AfterShip', { tracking: item.tracking_number });
              results.push({
                id: item.id,
                tracking: item.tracking_number,
                oldStatus: item.fulfillment_status,
                newStatus: null,
                error: 'Created in AfterShip, will check next run'
              });
            } else {
              const createError = await createResponse.text();
              logStep('Failed to create tracking', { tracking: item.tracking_number, error: createError });
              results.push({
                id: item.id,
                tracking: item.tracking_number,
                oldStatus: item.fulfillment_status,
                newStatus: null,
                error: `Failed to create: ${createResponse.status}`
              });
            }
            continue;
          }

          const errorText = await response.text();
          logStep('AfterShip API error', { status: response.status, error: errorText });
          results.push({
            id: item.id,
            tracking: item.tracking_number,
            oldStatus: item.fulfillment_status,
            newStatus: null,
            error: `API error: ${response.status}`
          });
          continue;
        }

        const data = await response.json();
        const tracking = data.data?.tracking;
        const tag = tracking?.tag;

        logStep('Got tracking status', { tracking: item.tracking_number, tag });

        // Map AfterShip status to our status
        const newStatus = statusMap[tag];
        
        if (newStatus && newStatus !== item.fulfillment_status) {
          const updateData: Record<string, unknown> = {
            fulfillment_status: newStatus,
          };

          // Add delivered_at timestamp if delivered
          if (newStatus === 'delivered') {
            updateData.delivered_at = new Date().toISOString();
          }

          const { error: updateError } = await supabaseClient
            .from('order_items')
            .update(updateData)
            .eq('id', item.id);

          if (updateError) {
            logStep('Failed to update item', { id: item.id, error: updateError.message });
            results.push({
              id: item.id,
              tracking: item.tracking_number,
              oldStatus: item.fulfillment_status,
              newStatus: null,
              error: updateError.message
            });
          } else {
            logStep('Updated item status', { id: item.id, oldStatus: item.fulfillment_status, newStatus });
            results.push({
              id: item.id,
              tracking: item.tracking_number,
              oldStatus: item.fulfillment_status,
              newStatus
            });
            updatedCount++;
          }
        } else {
          results.push({
            id: item.id,
            tracking: item.tracking_number,
            oldStatus: item.fulfillment_status,
            newStatus: null
          });
        }

        // Rate limit: AfterShip has limits, add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (itemError) {
        const errorMsg = itemError instanceof Error ? itemError.message : 'Unknown error';
        logStep('Error processing item', { id: item.id, error: errorMsg });
        results.push({
          id: item.id,
          tracking: item.tracking_number,
          oldStatus: item.fulfillment_status,
          newStatus: null,
          error: errorMsg
        });
      }
    }

    logStep('Polling complete', { checked: pendingItems.length, updated: updatedCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: pendingItems.length,
        updated: updatedCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Fatal error', { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
