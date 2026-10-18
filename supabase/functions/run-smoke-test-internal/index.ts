import { corsHeaders } from '../_shared/corsHeaders.ts';
import { requireTestFunctionsAuth, testFunctionsForwardHeaders } from '../_shared/testFunctionsAuth.ts';
// Internal helper: invokes e2e-marketplace-smoke-test with service-role auth.
// Requires the same shared-secret/admin authorization as the target.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";



serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const testAuthorization = await requireTestFunctionsAuth(req, corsHeaders);
  if (testAuthorization.response) return testAuthorization.response;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const body = await req.text().catch(() => "{}");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/e2e-marketplace-smoke-test`, {
    method: "POST",
    headers: testFunctionsForwardHeaders(req),
    body: body || "{}",
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
