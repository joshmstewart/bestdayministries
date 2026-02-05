import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

interface UsageLogParams {
  functionName: string;
  model?: string;
  userId?: string;
  inputTokens?: number;
  outputTokens?: number;
  metadata?: Record<string, unknown>;
}

export async function logAiUsage(params: UsageLogParams): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials for AI usage logging");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("ai_gateway_usage_log").insert({
      function_name: params.functionName,
      model: params.model || null,
      user_id: params.userId || null,
      input_tokens: params.inputTokens || null,
      output_tokens: params.outputTokens || null,
      metadata: params.metadata || {},
    });
  } catch (error) {
    // Don't fail the main function if logging fails
    console.error("Failed to log AI usage:", error);
  }
}
