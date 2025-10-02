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

    // Check if user has admin-level access using user_roles table
    const { data: currentUserRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !currentUserRole || !["admin", "owner"].includes(currentUserRole.role)) {
      throw new Error("Insufficient permissions");
    }

    // Get the user ID and new role from the request body
    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      throw new Error("User ID and new role are required");
    }

    // Check the target user's current role from user_roles table
    const { data: targetUserRole, error: targetRoleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (targetRoleError) {
      throw new Error("Target user not found");
    }

    // Admins can only change roles for non-admin users (caregiver, bestie, supporter)
    // Only owners can change admin/owner roles
    const adminLevelRoles = ["admin", "owner"];
    if (adminLevelRoles.includes(targetUserRole.role) || adminLevelRoles.includes(newRole)) {
      if (currentUserRole.role !== "owner") {
        throw new Error("Only owners can modify admin-level roles");
      }
    }

    // Delete old role(s) and insert new role
    await supabaseClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    const { error: insertError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role: newRole,
        created_by: user.id,
      });

    if (insertError) {
      throw insertError;
    }

    // Also update profiles table for backward compatibility
    await supabaseClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

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