// TEMPORARY audit helper: forwards a synthetic inbound-email payload to
// process-inbound-email using the server-side Cloudflare webhook secret.
// It never returns or logs the secret. Delete after the audit.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-audit-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auditKey = Deno.env.get("VENDOR_PAYOUT_CRON_SECRET");
  if (!auditKey || req.headers.get("x-audit-key") !== auditKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("CLOUDFLARE_EMAIL_WEBHOOK_SECRET") ?? "";
  const body = await req.text();
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-inbound-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": secret,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
    },
    body,
  });
  const text = await res.text();
  return new Response(JSON.stringify({ upstreamStatus: res.status, upstreamBody: text }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
