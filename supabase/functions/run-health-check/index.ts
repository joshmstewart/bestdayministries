import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SENDERS, SITE_URL, ORGANIZATION_NAME } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Critical functions to check — must match edgeFunctionRegistry.ts
const CRITICAL_FUNCTIONS = [
  'picture-password-login',
  'stripe-webhook',
  'create-sponsorship-checkout',
  'verify-sponsorship-payment',
  'create-marketplace-checkout',
  'verify-marketplace-payment',
  'create-donation-checkout',
  'reconcile-donations-from-stripe',
  'manage-sponsorship',
  'update-sponsorship',
];

interface HealthResult {
  name: string;
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
    // Check all critical functions
    const results: HealthResult[] = await Promise.all(
      CRITICAL_FUNCTIONS.map(async (name): Promise<HealthResult> => {
        const url = `${supabaseUrl}/functions/v1/${name}`;
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(url, { method: "OPTIONS", signal: controller.signal });
          clearTimeout(timer);
          const elapsed = Date.now() - start;

          if (response.status === 200 || response.status === 204) {
            return { name, status: elapsed > 2000 ? 'slow' : 'alive', responseTimeMs: elapsed, httpStatus: response.status };
          }
          return { name, status: 'dead', responseTimeMs: elapsed, httpStatus: response.status, error: `HTTP ${response.status}` };
        } catch (err) {
          const elapsed = Date.now() - start;
          const msg = err instanceof Error ? err.message : String(err);
          return { name, status: 'dead', responseTimeMs: elapsed, error: msg.includes('abort') ? 'Timeout' : msg };
        }
      })
    );

    const deadFunctions = results.filter(r => r.status === 'dead');
    const deadCount = deadFunctions.length;
    const aliveCount = results.filter(r => r.status === 'alive').length;
    const slowCount = results.filter(r => r.status === 'slow').length;

    // Store result in DB
    const { error: insertError } = await supabase.from('health_check_results').insert({
      scope: 'critical',
      total_checked: results.length,
      alive_count: aliveCount,
      slow_count: slowCount,
      dead_count: deadCount,
      dead_critical_count: deadCount, // all checked functions are critical
      dead_functions: deadFunctions.map(f => ({ name: f.name, error: f.error, httpStatus: f.httpStatus })),
      all_results: results,
      alert_sent: deadCount > 0,
    });

    if (insertError) {
      console.error("Failed to store health check result:", insertError);
    }

    // Clean up old results (keep 7 days)
    await supabase
      .from('health_check_results')
      .delete()
      .lt('checked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // If dead functions found, alert admins
    if (deadCount > 0) {
      const deadNames = deadFunctions.map(f => f.name).join(', ');

      // 1. Create in-app notifications for all admins
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'owner']);

      if (adminUsers && adminUsers.length > 0) {
        // Check if we already sent a notification in the last 4 hours for same functions
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        const { data: recentNotifs } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'system_health_alert')
          .gte('created_at', fourHoursAgo)
          .limit(1);

        if (!recentNotifs || recentNotifs.length === 0) {
          // Insert notifications for all admins
          const notifications = adminUsers.map(admin => ({
            user_id: admin.user_id,
            type: 'system_health_alert',
            title: `🚨 ${deadCount} critical function${deadCount > 1 ? 's' : ''} DOWN`,
            message: deadNames,
            link: '/admin?tab=system-health',
            metadata: {
              dead_functions: deadFunctions.map(f => f.name),
              dead_count: deadCount,
            },
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error("Failed to create notifications:", notifError);
          }

          // 2. Send email alert to owners only (they're the ones who can fix it)
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
                  const deadListHtml = deadFunctions.map(f =>
                    `<li style="margin-bottom: 8px;">
                      <strong style="color: #dc2626;">${f.name}</strong>
                      <span style="color: #6b7280; font-size: 13px;"> — ${f.error || 'Not responding'}</span>
                    </li>`
                  ).join('');

                  try {
                    await resend.emails.send({
                      from: SENDERS.notifications,
                      to: ownerEmails,
                      subject: `🚨 ${deadCount} Critical Function${deadCount > 1 ? 's' : ''} DOWN — ${ORGANIZATION_NAME}`,
                      html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                            <h1 style="color: #dc2626; margin: 0 0 8px 0; font-size: 20px;">🚨 System Health Alert</h1>
                            <p style="color: #991b1b; margin: 0; font-size: 16px;">
                              ${deadCount} critical backend function${deadCount > 1 ? 's are' : ' is'} not responding.
                            </p>
                          </div>
                          <h2 style="color: #111; font-size: 16px; margin-bottom: 12px;">Down Functions:</h2>
                          <ul style="list-style: none; padding: 0; margin: 0 0 24px 0;">${deadListHtml}</ul>
                          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                            <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">🔧 How to fix:</p>
                            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
                              <li style="margin-bottom: 4px;">Open Lovable chat</li>
                              <li style="margin-bottom: 4px;">Ask: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">redeploy ${deadFunctions[0]?.name || 'function-name'}</code></li>
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

    return new Response(
      JSON.stringify({
        checkedAt: new Date().toISOString(),
        summary: { total: results.length, alive: aliveCount, slow: slowCount, dead: deadCount },
        deadFunctions: deadFunctions.map(f => f.name),
        alertSent: deadCount > 0,
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
