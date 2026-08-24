import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[retry-vendor-transfers] ${step}${detailsStr}`);
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

    // --- Authorization: this endpoint moves real money. Cron secret, service role, or admin/owner only. ---
    const cronSecret = Deno.env.get('VENDOR_PAYOUT_CRON_SECRET');
    const providedCronSecret = req.headers.get('x-cron-secret');
    let authorized = !!cronSecret && providedCronSecret === cronSecret;

    if (!authorized) {
      const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
        });
      }

      if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
        authorized = true;
      } else {
        const { data: userData } = await supabaseClient.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userId) {
          const { data: roles } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);
          authorized = (roles ?? []).some((r: { role: string }) => r.role === 'admin' || r.role === 'owner');
        }
      }
    }

    if (!authorized) {
      logStep('Unauthorized request rejected');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    logStep('Starting retry of pending vendor transfers');

    // Find order items that are shipped/delivered but missing stripe_transfer_id
    const { data: pendingItems, error: fetchError } = await supabaseClient
      .from('order_items')
      .select(`
        id,
        vendor_id,
        vendor_payout,
        fulfillment_status,
        order_id,
        orders!inner(stripe_mode, status)
      `)
      .in('fulfillment_status', ['shipped', 'delivered'])
      .is('stripe_transfer_id', null)
      .gt('vendor_payout', 0)
      // Never pay out on orders that were cancelled or refunded
      .not('orders.status', 'in', '(cancelled,refunded)')
      // Stop hammering Stripe for items that keep failing permanently
      .or('transfer_attempts.is.null,transfer_attempts.lt.10');

    if (fetchError) {
      logStep('Error fetching pending items', { error: fetchError });
      throw new Error(`Failed to fetch pending items: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      logStep('No pending transfers found');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending transfers', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    logStep('Found pending transfers', { count: pendingItems.length });

    const results: { itemId: string; success: boolean; error?: string; transferId?: string }[] = [];

    // Process each item
    for (const item of pendingItems) {
      try {
        logStep('Processing transfer', { orderItemId: item.id, vendorPayout: item.vendor_payout });

        // Call the create-vendor-transfer function
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-vendor-transfer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ orderItemId: item.id }),
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          logStep('Transfer successful', { itemId: item.id, transferId: result.transferId });
          results.push({ itemId: item.id, success: true, transferId: result.transferId });
        } else {
          logStep('Transfer failed', { itemId: item.id, error: result.error });
          results.push({ itemId: item.id, success: false, error: result.error });
        }

        // Small delay between transfers to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (itemError) {
        const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error';
        logStep('Error processing item', { itemId: item.id, error: errorMessage });
        results.push({ itemId: item.id, success: false, error: errorMessage });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logStep('Retry complete', { successful, failed, total: results.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        successful,
        failed,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[retry-vendor-transfers] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
