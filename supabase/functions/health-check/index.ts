const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    let functionNames: string[] = [];
    let timeoutMs = 5000;

    if (req.method === "POST") {
      const body = await req.json();
      functionNames = body.functionNames || [];
      timeoutMs = body.timeoutMs || 5000;
    }

    if (functionNames.length === 0) {
      return new Response(
        JSON.stringify({ error: "functionNames array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check functions in parallel with concurrency limit
    const BATCH_SIZE = 20;
    const results: HealthResult[] = [];

    for (let i = 0; i < functionNames.length; i += BATCH_SIZE) {
      const batch = functionNames.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (name): Promise<HealthResult> => {
          const url = `${supabaseUrl}/functions/v1/${name}`;
          const start = Date.now();

          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
              method: "OPTIONS",
              signal: controller.signal,
            });

            clearTimeout(timer);
            const elapsed = Date.now() - start;

            if (response.status === 200 || response.status === 204) {
              return {
                name,
                status: elapsed > 2000 ? 'slow' : 'alive',
                responseTimeMs: elapsed,
                httpStatus: response.status,
              };
            } else {
              return {
                name,
                status: 'dead',
                responseTimeMs: elapsed,
                httpStatus: response.status,
                error: `HTTP ${response.status}`,
              };
            }
          } catch (err) {
            const elapsed = Date.now() - start;
            const errorMsg = err instanceof Error ? err.message : String(err);
            return {
              name,
              status: 'dead',
              responseTimeMs: elapsed,
              error: errorMsg.includes('abort') ? 'Timeout' : errorMsg,
            };
          }
        })
      );
      results.push(...batchResults);
    }

    const alive = results.filter(r => r.status === 'alive').length;
    const slow = results.filter(r => r.status === 'slow').length;
    const dead = results.filter(r => r.status === 'dead').length;

    return new Response(
      JSON.stringify({
        checkedAt: new Date().toISOString(),
        summary: { total: results.length, alive, slow, dead },
        results,
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
