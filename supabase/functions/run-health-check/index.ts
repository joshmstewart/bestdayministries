import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SENDERS, SITE_URL, ORGANIZATION_NAME } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All functions to check — must match edgeFunctionRegistry.ts
// Tier: critical | important | utility
const ALL_FUNCTIONS: { name: string; tier: string }[] = [
  // Critical
  { name: 'picture-password-login', tier: 'critical' },
  { name: 'stripe-webhook', tier: 'critical' },
  { name: 'create-sponsorship-checkout', tier: 'critical' },
  { name: 'verify-sponsorship-payment', tier: 'critical' },
  { name: 'create-marketplace-checkout', tier: 'critical' },
  { name: 'verify-marketplace-payment', tier: 'critical' },
  { name: 'create-donation-checkout', tier: 'critical' },
  { name: 'reconcile-donations-from-stripe', tier: 'critical' },
  { name: 'manage-sponsorship', tier: 'critical' },
  { name: 'update-sponsorship', tier: 'critical' },
  // Important
  { name: 'text-to-speech', tier: 'important' },
  { name: 'text-to-speech-bestie', tier: 'important' },
  { name: 'moderate-content', tier: 'important' },
  { name: 'moderate-image', tier: 'important' },
  { name: 'moderate-video', tier: 'important' },
  { name: 'scratch-card', tier: 'important' },
  { name: 'scratch-daily-card', tier: 'important' },
  { name: 'purchase-bonus-card', tier: 'important' },
  { name: 'generate-recipe-suggestions', tier: 'important' },
  { name: 'generate-full-recipe', tier: 'important' },
  { name: 'regenerate-recipe-image', tier: 'important' },
  { name: 'generate-recipe-expansion-tips', tier: 'important' },
  { name: 'generate-coloring-page-ideas', tier: 'important' },
  { name: 'generate-coloring-page', tier: 'important' },
  { name: 'generate-memory-match-icon', tier: 'important' },
  { name: 'generate-memory-match-card-back', tier: 'important' },
  { name: 'generate-memory-match-description', tier: 'important' },
  { name: 'send-newsletter', tier: 'important' },
  { name: 'send-sponsorship-receipt', tier: 'important' },
  { name: 'send-notification-email', tier: 'important' },
  { name: 'send-digest-email', tier: 'important' },
  { name: 'send-contact-email', tier: 'important' },
  { name: 'send-contact-reply', tier: 'important' },
  { name: 'notify-admin-new-contact', tier: 'important' },
  { name: 'send-approval-notification', tier: 'important' },
  { name: 'send-message-notification', tier: 'important' },
  { name: 'record-terms-acceptance', tier: 'important' },
  { name: 'create-user', tier: 'important' },
  { name: 'delete-user', tier: 'important' },
  { name: 'update-user-role', tier: 'important' },
  { name: 'get-google-places-key', tier: 'important' },
  { name: 'lookup-guest-order', tier: 'important' },
  { name: 'create-stripe-connect-account', tier: 'important' },
  { name: 'check-stripe-connect-status', tier: 'important' },
  { name: 'submit-tracking', tier: 'important' },
  { name: 'send-order-shipped', tier: 'important' },
  { name: 'broadcast-product-update', tier: 'important' },
  { name: 'unsubscribe-newsletter', tier: 'important' },
  { name: 'track-newsletter-click', tier: 'important' },
  { name: 'process-inbound-email', tier: 'important' },
  { name: 'generate-sitemap', tier: 'important' },
  { name: 'generate-meta-tags', tier: 'important' },
  { name: 'claim-streak-reward', tier: 'important' },
  { name: 'get-donation-history', tier: 'important' },
  { name: 'generate-avatar-image', tier: 'important' },
  { name: 'generate-workout-image', tier: 'important' },
  { name: 'generate-workout-location-image', tier: 'important' },
  { name: 'extract-pdf-pages', tier: 'important' },
  { name: 'send-vendor-order-notification', tier: 'important' },
  { name: 'printify-webhook', tier: 'important' },
  { name: 'create-printify-order', tier: 'important' },
  // Utility (skip health-check itself and run-health-check)
  { name: 'seed-email-test-data', tier: 'utility' },
  { name: 'set-test-admin-roles', tier: 'utility' },
  { name: 'cleanup-test-data-unified', tier: 'utility' },
  { name: 'setup-test-sponsorship', tier: 'utility' },
  { name: 'test-contact-form-helper', tier: 'utility' },
  { name: 'github-test-webhook', tier: 'utility' },
  { name: 'get-sentry-dsn', tier: 'utility' },
  { name: 'sentry-webhook', tier: 'utility' },
  { name: 'debug-donation-reconciliation', tier: 'utility' },
  { name: 'cleanup-duplicate-donations', tier: 'utility' },
  { name: 'generate-missing-receipts', tier: 'utility' },
  { name: 'generate-missing-donation-receipts', tier: 'utility' },
  { name: 'send-missing-receipt-emails', tier: 'utility' },
  { name: 'generate-year-end-summary', tier: 'utility' },
  { name: 'send-batch-year-end-summaries', tier: 'utility' },
  { name: 'sync-donation-history', tier: 'utility' },
  { name: 'create-donation-from-stripe', tier: 'utility' },
  { name: 'donation-mapping-snapshot', tier: 'utility' },
  { name: 'aftership-webhook', tier: 'utility' },
  { name: 'fetch-printify-products', tier: 'utility' },
  { name: 'import-printify-product', tier: 'utility' },
  { name: 'check-printify-status', tier: 'utility' },
  { name: 'seed-valentine-stickers', tier: 'utility' },
  { name: 'seed-halloween-stickers', tier: 'utility' },
  { name: 'generate-sticker-description', tier: 'utility' },
  { name: 'generate-vibe-icon', tier: 'utility' },
  { name: 'generate-ingredient-icon', tier: 'utility' },
  { name: 'generate-recipe-ingredient-icon', tier: 'utility' },
  { name: 'generate-recipe-tool-icon', tier: 'utility' },
  { name: 'backfill-recipe-tools', tier: 'utility' },
  { name: 'send-test-newsletter', tier: 'utility' },
  { name: 'process-newsletter-queue', tier: 'utility' },
  { name: 'resend-webhook', tier: 'utility' },
  { name: 'handle-resend-webhook', tier: 'utility' },
  { name: 'sync-newsletter-analytics', tier: 'utility' },
  { name: 'sync-order-to-shipstation', tier: 'utility' },
  { name: 'poll-shipstation-status', tier: 'utility' },
  { name: 'poll-aftership-status', tier: 'utility' },
  { name: 'reconcile-marketplace-orders', tier: 'utility' },
  { name: 'retry-vendor-transfers', tier: 'utility' },
  { name: 'process-platform-payout', tier: 'utility' },
  { name: 'process-event-email-queue', tier: 'utility' },
  { name: 'award-time-trial-rewards', tier: 'utility' },
  { name: 'generate-wordle-word-scheduled', tier: 'utility' },
  { name: 'generate-fortune-posts', tier: 'utility' },
  { name: 'generate-fortunes-batch', tier: 'utility' },
  { name: 'recover-all-missing-donations', tier: 'utility' },
];

interface HealthResult {
  name: string;
  tier: string;
  status: 'alive' | 'dead' | 'slow';
  responseTimeMs: number;
  httpStatus?: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check all functions in batches of 20
    const BATCH_SIZE = 20;
    const results: HealthResult[] = [];

    for (let i = 0; i < ALL_FUNCTIONS.length; i += BATCH_SIZE) {
      const batch = ALL_FUNCTIONS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (fn): Promise<HealthResult> => {
          const url = `${supabaseUrl}/functions/v1/${fn.name}`;
          const start = Date.now();
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(url, { method: "OPTIONS", signal: controller.signal });
            clearTimeout(timer);
            const elapsed = Date.now() - start;

            if (response.status === 200 || response.status === 204) {
              return { name: fn.name, tier: fn.tier, status: elapsed > 2000 ? 'slow' : 'alive', responseTimeMs: elapsed, httpStatus: response.status };
            }
            return { name: fn.name, tier: fn.tier, status: 'dead', responseTimeMs: elapsed, httpStatus: response.status, error: `HTTP ${response.status}` };
          } catch (err) {
            const elapsed = Date.now() - start;
            const msg = err instanceof Error ? err.message : String(err);
            return { name: fn.name, tier: fn.tier, status: 'dead', responseTimeMs: elapsed, error: msg.includes('abort') ? 'Timeout' : msg };
          }
        })
      );
      results.push(...batchResults);
    }

    const deadFunctions = results.filter(r => r.status === 'dead');
    const deadCritical = deadFunctions.filter(r => r.tier === 'critical');
    const deadCount = deadFunctions.length;
    const aliveCount = results.filter(r => r.status === 'alive').length;
    const slowCount = results.filter(r => r.status === 'slow').length;

    // Store result in DB
    const { error: insertError } = await supabase.from('health_check_results').insert({
      scope: 'all',
      total_checked: results.length,
      alive_count: aliveCount,
      slow_count: slowCount,
      dead_count: deadCount,
      dead_critical_count: deadCritical.length,
      dead_functions: deadFunctions.map(f => ({ name: f.name, tier: f.tier, error: f.error, httpStatus: f.httpStatus })),
      all_results: results,
      alert_sent: deadCritical.length > 0,
    });

    if (insertError) {
      console.error("Failed to store health check result:", insertError);
    }

    // Clean up old results (keep 7 days)
    await supabase
      .from('health_check_results')
      .delete()
      .lt('checked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // If CRITICAL functions are dead, alert admins (same behavior as before but only for critical)
    if (deadCritical.length > 0) {
      const deadNames = deadCritical.map(f => f.name).join(', ');

      // 1. Create in-app notifications for all admins
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'owner']);

      if (adminUsers && adminUsers.length > 0) {
        // Check if we already sent a notification in the last 4 hours
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        const { data: recentNotifs } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'system_health_alert')
          .gte('created_at', fourHoursAgo)
          .limit(1);

        if (!recentNotifs || recentNotifs.length === 0) {
          const notifications = adminUsers.map(admin => ({
            user_id: admin.user_id,
            type: 'system_health_alert',
            title: `🚨 ${deadCritical.length} critical function${deadCritical.length > 1 ? 's' : ''} DOWN`,
            message: deadNames,
            link: '/admin?tab=system-health',
            metadata: {
              dead_functions: deadCritical.map(f => f.name),
              dead_count: deadCritical.length,
              total_dead: deadCount,
            },
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error("Failed to create notifications:", notifError);
          }

          // 2. Send email alert to owners
          if (resendApiKey) {
            const resend = new Resend(resendApiKey);

            const { data: ownerRoles } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'owner');

            const ownerIds = (ownerRoles || []).map(o => o.user_id);
            if (ownerIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email, display_name')
                .in('id', ownerIds);

              if (profiles && profiles.length > 0) {
                const ownerEmails = profiles.filter(p => p.email).map(p => p.email!);

                if (ownerEmails.length > 0) {
                  const deadListHtml = deadCritical.map(f =>
                    `<li style="margin-bottom: 8px;">
                      <strong style="color: #dc2626;">${f.name}</strong>
                      <span style="color: #6b7280; font-size: 13px;"> — ${f.error || 'Not responding'}</span>
                    </li>`
                  ).join('');

                  const additionalInfo = deadCount > deadCritical.length
                    ? `<p style="color: #92400e; margin-top: 12px;">Additionally, ${deadCount - deadCritical.length} non-critical function(s) are also down.</p>`
                    : '';

                  try {
                    await resend.emails.send({
                      from: SENDERS.notifications,
                      to: ownerEmails,
                      subject: `🚨 ${deadCritical.length} Critical Function${deadCritical.length > 1 ? 's' : ''} DOWN — ${ORGANIZATION_NAME}`,
                      html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                            <h1 style="color: #dc2626; margin: 0 0 8px 0; font-size: 20px;">🚨 System Health Alert</h1>
                            <p style="color: #991b1b; margin: 0; font-size: 16px;">
                              ${deadCritical.length} critical backend function${deadCritical.length > 1 ? 's are' : ' is'} not responding.
                            </p>
                          </div>
                          <h2 style="color: #111; font-size: 16px; margin-bottom: 12px;">Critical Functions Down:</h2>
                          <ul style="list-style: none; padding: 0; margin: 0 0 24px 0;">${deadListHtml}</ul>
                          ${additionalInfo}
                          <p style="color: #6b7280; font-size: 14px;">Total checked: ${results.length} • Alive: ${aliveCount} • Slow: ${slowCount} • Dead: ${deadCount}</p>
                          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                            <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">🔧 How to fix:</p>
                            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
                              <li style="margin-bottom: 4px;">Open Lovable chat</li>
                              <li style="margin-bottom: 4px;">Ask: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">redeploy ${deadCritical[0]?.name || 'function-name'}</code></li>
                              <li>Check the Health tab in Admin to verify</li>
                            </ol>
                          </div>
                          <a href="${SITE_URL}/admin?tab=system-health" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View System Health →</a>
                          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Checked at: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })} MST</p>
                        </div>
                      `,
                    });
                    console.log(`Health alert email sent to ${ownerEmails.length} owner(s)`);
                  } catch (emailErr) {
                    console.error("Failed to send health alert email:", emailErr);
                  }
                }
              }
            }
          }
        } else {
          console.log("Skipping alert — already notified within last 4 hours");
        }
      }
    }

    console.log(`Health check complete: ${aliveCount} alive, ${slowCount} slow, ${deadCount} dead (${deadCritical.length} critical)`);

    return new Response(
      JSON.stringify({
        checkedAt: new Date().toISOString(),
        summary: { total: results.length, alive: aliveCount, slow: slowCount, dead: deadCount, deadCritical: deadCritical.length },
        deadFunctions: deadFunctions.map(f => f.name),
        alertSent: deadCritical.length > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ error: "Health check failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
