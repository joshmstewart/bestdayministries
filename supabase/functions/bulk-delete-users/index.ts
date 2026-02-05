import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schema
const bulkDeleteUsersSchema = z.object({
  userIds: z.array(z.string().uuid("Invalid user ID format")).min(1).max(1000)
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the requesting user has admin-level access
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin-level access
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'owner')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and validate the user IDs to delete
    const requestBody = await req.json();
    
    const validationResult = bulkDeleteUsersSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: `Validation failed: ${errors}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { userIds } = validationResult.data;
    
    // Prevent self-deletion
    if (userIds.includes(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.id} (${userRole.role}) initiating bulk delete of ${userIds.length} users`);

    const results = {
      total: userIds.length,
      succeeded: 0,
      failed: 0,
      errors: [] as { userId: string; error: string; details?: string }[]
    };

    // Delete users in batches of 10 to avoid overwhelming the system
    const BATCH_SIZE = 10;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (userId) => {
          try {
            // Check if user is an admin (only owners can delete admins)
            const { data: targetRole } = await supabaseAdmin
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .maybeSingle();

            if (targetRole?.role === 'admin' && userRole.role !== 'owner') {
              throw new Error('Only owners can delete admin accounts');
            }

            // Delete the user
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            
            if (deleteError) {
              console.error(`Delete error for ${userId}:`, {
                message: deleteError.message,
                code: deleteError.code,
                status: deleteError.status
              });
              throw deleteError;
            }
            
            results.succeeded++;
            console.log(`✅ Deleted user ${userId} (${i + batch.indexOf(userId) + 1}/${userIds.length})`);
          } catch (error: any) {
            results.failed++;
            const errorMsg = error.message || 'Unknown error';
            results.errors.push({
              userId,
              error: errorMsg,
              details: error.code || error.status
            });
            console.error(`❌ Failed to delete user ${userId}:`, errorMsg);
          }
        })
      );
    }

    console.log(`🎯 Bulk delete complete: ${results.succeeded} succeeded, ${results.failed} failed`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in bulk-delete-users function:', {
      type: error?.constructor?.name || 'Unknown',
      code: error?.code || 'none'
    });
    
    return new Response(
      JSON.stringify({ error: 'Failed to delete users. Please try again.' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
