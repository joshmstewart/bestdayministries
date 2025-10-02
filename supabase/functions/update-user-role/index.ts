import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the request is from an authenticated admin/owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has admin-level access (admin or owner)
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["admin", "owner"].includes(profile.role)) {
      throw new Error("Insufficient permissions");
    }

    // Get the user ID and new role from the request body
    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      throw new Error("User ID and new role are required");
    }

    // Check the target user's current role
    const { data: targetProfile, error: targetProfileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetProfileError) {
      throw new Error("Target user not found");
    }

    // Admins can only change roles for non-admin users (caregiver, bestie, supporter)
    // Only owners can change admin/owner roles
    const adminLevelRoles = ["admin", "owner"];
    if (adminLevelRoles.includes(targetProfile.role) || adminLevelRoles.includes(newRole)) {
      if (profile.role !== "owner") {
        throw new Error("Only owners can modify admin-level roles");
      }
    }

    // Update the user's role
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (updateError) {
      throw updateError;
    }

    console.log(`User ${userId} role changed to ${newRole} by ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "User role updated successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in update-user-role function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});