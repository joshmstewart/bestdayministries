import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * One-time setup function to create the system user account.
 * This account is used for automated posts (Daily Inspiration, etc.)
 * 
 * The system user:
 * - Has email: system@bestdayministries.app (non-deliverable)
 * - Has a random password (never shared)
 * - Has display_name: "Best Day Ministries"
 * - Has role: owner (for permissions)
 * - Is stored in app_settings as system_user_id
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin/owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin/owner
    const { data: userRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (!["admin", "owner"].includes(userRole?.role || "")) {
      return new Response(
        JSON.stringify({ error: "Only admins/owners can create system user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if system user already exists
    const { data: existingSetting } = await adminClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "system_user_id")
      .maybeSingle();

    if (existingSetting?.setting_value) {
      // Verify the user still exists
      const { data: existingUser } = await adminClient.auth.admin.getUserById(
        existingSetting.setting_value as string
      );
      
      if (existingUser?.user) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "System user already exists",
            system_user_id: existingSetting.setting_value,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate a random secure password (32 chars)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);

    // Create the system user via Auth Admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: "system@bestdayministries.app",
      password: randomPassword,
      email_confirm: true, // Auto-confirm since it's a system account
      user_metadata: {
        display_name: "Best Day Ministries",
        role: "owner",
      },
    });

    if (createError) {
      console.error("Error creating system user:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create system user: " + createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemUserId = newUser.user.id;
    console.log("Created system user:", systemUserId);

    // The handle_new_user trigger will create the profile automatically
    // But we need to update it to have the correct display_name and no avatar
    await adminClient
      .from("profiles")
      .update({
        display_name: "Best Day Ministries",
        avatar_number: null,
        avatar_url: null,
      })
      .eq("id", systemUserId);

    // Insert owner role (handle_new_user may have set a different default)
    await adminClient
      .from("user_roles")
      .upsert({
        user_id: systemUserId,
        role: "owner",
      }, { onConflict: "user_id" });

    // Store system_user_id in app_settings
    await adminClient
      .from("app_settings")
      .upsert({
        setting_key: "system_user_id",
        setting_value: systemUserId,
        updated_at: new Date().toISOString(),
        updated_by: requestingUser.id,
      }, { onConflict: "setting_key" });

    console.log("System user setup complete:", systemUserId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "System user created successfully",
        system_user_id: systemUserId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-system-user:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
