import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[retry-vendor-order-notifications] ${step}${detailsStr}`);
};

const MAX_ATTEMPTS = 5;
// Wait at least this long after the order was paid before sweeping it,
// to give the live path in verify-marketplace-payment a fair chance to fire.
const MIN_AGE_MINUTES = 5;
// Don't spam ancient backlog.
const MAX_AGE_DAYS = 30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting sweep for missed vendor order notifications');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const minAgeISO = new Date(Date.now() - MIN_AGE_MINUTES * 60 * 1000).toISOString();
    const maxAgeISO = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Fetch candidate paid orders with order_items that have a vendor_id.
    // We consider an order "paid" if status is one of these AND paid_at is set.
    const { data: orderItems, error: fetchError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        vendor_id,
        orders!inner(id, status, paid_at, created_at)
      `)
      .not('vendor_id', 'is', null)
      .in('orders.status', ['paid', 'processing', 'completed'])
      .not('orders.paid_at', 'is', null)
      .lte('orders.paid_at', minAgeISO)
      .gte('orders.paid_at', maxAgeISO);

    if (fetchError) {
      logStep('Error fetching candidate order items', { error: fetchError });
      throw new Error(`Failed to fetch candidates: ${fetchError.message}`);
    }

    // Deduplicate to unique (order_id, vendor_id) pairs.
    const pairMap = new Map<string, { orderId: string; vendorId: string }>();
    for (const item of orderItems || []) {
      const key = `${item.order_id}::${item.vendor_id}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, { orderId: item.order_id, vendorId: item.vendor_id });
      }
    }

    logStep('Candidate pairs gathered', { candidatePairs: pairMap.size });

    if (pairMap.size === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, succeeded: 0, failed: 0, skipped: 0, details: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // For each pair, check email_notifications_log for an existing successful notification.
    // If one exists, skip. Otherwise count failed attempts to enforce DLQ cap.
    const details: Array<Record<string, unknown>> = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let dlq = 0;

    for (const { orderId, vendorId } of pairMap.values()) {
      try {
        const { data: existingLogs, error: logErr } = await supabase
          .from('email_notifications_log')
          .select('id, status, notification_type, created_at')
          .in('notification_type', ['vendor_new_order', 'house_vendor_new_order', 'vendor_new_order_dlq'])
          .filter('metadata->>order_id', 'eq', orderId)
          .filter('metadata->>vendor_id', 'eq', vendorId);

        if (logErr) {
          logStep('Error reading email_notifications_log', { orderId, vendorId, error: logErr });
          failed += 1;
          details.push({ orderId, vendorId, action: 'log_query_error', error: logErr.message });
          continue;
        }

        const sentAlready = (existingLogs || []).some(l => l.status === 'sent' && l.notification_type !== 'vendor_new_order_dlq');
        if (sentAlready) {
          skipped += 1;
          details.push({ orderId, vendorId, action: 'skipped_already_sent' });
          continue;
        }

        const dlqAlready = (existingLogs || []).some(l => l.notification_type === 'vendor_new_order_dlq');
        if (dlqAlready) {
          skipped += 1;
          details.push({ orderId, vendorId, action: 'skipped_in_dlq' });
          continue;
        }

        const failedAttempts = (existingLogs || []).filter(l => l.status === 'failed').length;
        if (failedAttempts >= MAX_ATTEMPTS) {
          // Move to DLQ — record a single dlq row so admins can see it and we stop retrying.
          await supabase.from('email_notifications_log').insert({
            recipient_email: 'unknown',
            notification_type: 'vendor_new_order_dlq',
            subject: 'Vendor order notification failed after max retries',
            status: 'failed',
            metadata: {
              order_id: orderId,
              vendor_id: vendorId,
              failed_attempts: failedAttempts,
              moved_to_dlq_at: new Date().toISOString(),
            },
          });
          dlq += 1;
          details.push({ orderId, vendorId, action: 'moved_to_dlq', failedAttempts });
          continue;
        }

        // Attempt the send.
        logStep('Retrying vendor notification', { orderId, vendorId, priorFailedAttempts: failedAttempts });

        const resp = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-vendor-order-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ orderId, vendorId }),
          }
        );

        const body = await resp.json().catch(() => ({}));

        if (resp.ok && (body as { success?: boolean }).success) {
          succeeded += 1;
          details.push({ orderId, vendorId, action: 'sent', status: resp.status });
          logStep('Vendor notification sent', { orderId, vendorId });
        } else {
          // Record a failed attempt so we can count toward the DLQ cap.
          await supabase.from('email_notifications_log').insert({
            recipient_email: 'unknown',
            notification_type: 'vendor_new_order',
            subject: 'Vendor order notification retry failed',
            status: 'failed',
            error_message: typeof (body as { error?: unknown }).error === 'string'
              ? (body as { error?: string }).error
              : `HTTP ${resp.status}`,
            metadata: {
              order_id: orderId,
              vendor_id: vendorId,
              attempt: failedAttempts + 1,
              http_status: resp.status,
            },
          });
          failed += 1;
          details.push({
            orderId,
            vendorId,
            action: 'failed',
            httpStatus: resp.status,
            error: (body as { error?: unknown }).error ?? null,
            attemptNumber: failedAttempts + 1,
          });
          logStep('Vendor notification failed', { orderId, vendorId, status: resp.status, body });
        }
      } catch (pairErr) {
        const msg = pairErr instanceof Error ? pairErr.message : String(pairErr);
        logStep('Unexpected error processing pair', { orderId, vendorId, error: msg });
        failed += 1;
        details.push({ orderId, vendorId, action: 'exception', error: msg });
      }
    }

    const processed = succeeded + failed + skipped + dlq;
    logStep('Sweep complete', { processed, succeeded, failed, skipped, dlq });

    return new Response(
      JSON.stringify({ success: true, processed, succeeded, failed, skipped, dlq, details }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep('Fatal error', { error: msg });
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
