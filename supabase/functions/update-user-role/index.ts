import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation schema
const updateRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  newRole: z.enum(['admin', 'owner', 'caregiver', 'bestie', 'supporter']),
});

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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit: 20 role updates per hour
    const { data: rateLimitOk } = await supabaseClient.rpc('check_rate_limit', {
      _user_id: user.id,
      _endpoint: 'update-user-role',
      _max_requests: 20,
      _window_minutes: 60
    });

    if (!rateLimitOk) {
      console.log(`Rate limit exceeded for user ${user.id} on update-user-role`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin-level access using user_roles table
    const { data: currentUserRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !currentUserRole || !["admin", "owner"].includes(currentUserRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = updateRoleSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input. Please check your data and try again.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, newRole } = validation.data;

    // Check the target user's current role from user_roles table
    const { data: targetUserRole, error: targetRoleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (targetRoleError) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admins can only change roles for non-admin users (caregiver, bestie, supporter)
    // Only owners can change admin/owner roles
    const adminLevelRoles = ["admin", "owner"];
    if (adminLevelRoles.includes(targetUserRole.role) || adminLevelRoles.includes(newRole)) {
      if (currentUserRole.role !== "owner") {
        return new Response(
          JSON.stringify({ error: 'Only owners can modify admin-level roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});