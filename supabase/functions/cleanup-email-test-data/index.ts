import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting email test data cleanup...');
    
    const { testRunId, emailPrefix } = await req.json();
    const prefix = emailPrefix || `emailtest-${testRunId}`;

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get all test users by email prefix
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const testUsers = authUsers.users.filter(user => 
      user.email?.startsWith(prefix)
    );

    console.log(`Found ${testUsers.length} test users to clean up`);

    // Delete each test user (cascade will handle related data)
    for (const user of testUsers) {
      console.log(`Deleting user: ${user.email}`);
      
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        user.id
      );

      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError);
      } else {
        console.log(`✅ Deleted user: ${user.email}`);
      }
    }

    // Also clean up orphaned receipt settings from tests
    await supabaseAdmin
      .from('receipt_settings')
      .delete()
      .eq('organization_name', 'Test Organization');

    console.log('✅ Email test data cleanup complete!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data cleaned up successfully',
        deletedUsers: testUsers.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error cleaning up test data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
