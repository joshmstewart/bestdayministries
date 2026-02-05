import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    if (!user) {
      console.error("No user found in session");
      throw new Error("Not authenticated - no user in session");
    }

    console.log(`Recording terms acceptance for user: ${user.id}`);

    const { termsVersion, privacyVersion } = await req.json();

    // Get client IP and user agent
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    console.log(`Terms version: ${termsVersion}, Privacy version: ${privacyVersion}`);

    // Record acceptance with upsert to handle duplicate attempts
    const { error: dbError } = await supabaseClient
      .from("terms_acceptance")
      .upsert({
        user_id: user.id,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
        ip_address: ipAddress,
        user_agent: userAgent,
      }, {
        onConflict: 'user_id,terms_version,privacy_version',
        ignoreDuplicates: false
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    console.log(`✅ Successfully recorded terms acceptance for user: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, userId: user.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error recording terms acceptance:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});