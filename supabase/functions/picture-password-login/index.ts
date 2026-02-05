import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pictureSequence } = await req.json();

    if (!pictureSequence || !Array.isArray(pictureSequence) || pictureSequence.length !== 4) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid picture sequence" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limiting - 5 attempts per IP in 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { count: recentAttempts } = await supabase
      .from("picture_password_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIP)
      .eq("was_successful", false)
      .gte("attempted_at", fiveMinutesAgo);

    if (recentAttempts && recentAttempts >= 5) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many attempts. Please wait 5 minutes." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the picture password - convert array to Postgres array literal format
    const sequenceArray = `{${pictureSequence.join(",")}}`;
    console.log("Looking up picture sequence:", sequenceArray);
    
    const { data: passwordData, error: lookupError } = await supabase
      .from("picture_passwords")
      .select("user_id")
      .filter("picture_sequence", "eq", sequenceArray)
      .maybeSingle();

    if (lookupError) {
      console.error("Error looking up picture password:", lookupError);
      throw lookupError;
    }

    if (!passwordData) {
      // Log failed attempt
      await supabase.from("picture_password_attempts").insert({
        ip_address: clientIP,
        was_successful: false,
      });

      console.log(`Failed login attempt from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ success: false, error: "Picture code not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email for signing in
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      passwordData.user_id
    );

    if (userError || !userData.user) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a magic link token for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email!,
    });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the token from the link and verify it to get a session
    const token = new URL(linkData.properties.action_link).searchParams.get("token");
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create session token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the OTP to get session tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "magiclink",
    });

    if (sessionError || !sessionData.session) {
      console.error("Error verifying OTP:", sessionError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful attempt
    await supabase.from("picture_password_attempts").insert({
      ip_address: clientIP,
      was_successful: true,
    });

    console.log(`Successful picture password login for user: ${passwordData.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Picture password login error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
