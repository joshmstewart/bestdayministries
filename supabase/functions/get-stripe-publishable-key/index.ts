import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if force_test_mode is requested
    let forceTest = false;
    try {
      const body = await req.json();
      forceTest = body?.force_test_mode === true;
    } catch {
      // No body or invalid JSON, that's fine
    }

    let mode = 'test';
    if (!forceTest) {
      const { data: modeSetting } = await supabaseAdmin
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'stripe_mode')
        .single();
      mode = modeSetting?.setting_value || 'test';
    }

    const publishableKey = mode === 'live'
      ? Deno.env.get('STRIPE_PUBLISHABLE_KEY_LIVE')
      : Deno.env.get('STRIPE_PUBLISHABLE_KEY_TEST');

    if (!publishableKey) {
      throw new Error(`Stripe ${mode} publishable key not configured`);
    }

    return new Response(
      JSON.stringify({ publishable_key: publishableKey, mode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-stripe-publishable-key:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
