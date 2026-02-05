import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SetAdminRolesRequest {
  userIds: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds }: SetAdminRolesRequest = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log(`Setting admin role for ${userIds.length} users...`);

    const results = [];
    for (const userId of userIds) {
      // Upsert admin role (bypasses RLS with service role key)
      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .upsert(
          {
            user_id: userId,
            role: 'admin',
          },
          {
            onConflict: 'user_id,role',
          }
        )
        .select();

      if (error) {
        console.error(`Failed to set admin role for ${userId}:`, error);
        results.push({ userId, success: false, error: error.message });
      } else {
        console.log(`✅ Admin role set for ${userId}`);
        results.push({ userId, success: true });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Successfully set admin role for ${successCount}/${userIds.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: `${successCount}/${userIds.length} users granted admin role`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in set-test-admin-roles function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
