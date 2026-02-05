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

    // Filter test users by email prefix OR generic test patterns
    const testUsers = authUsers.users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      return (
        email.startsWith(prefix) ||
        email.includes('emailtest-') ||
        email === 'testbestie@example.com' ||
        email === 'testguardian@example.com' ||
        email === 'testsupporter@example.com' ||
        email === 'testvendor@example.com' ||
        (email.includes('test') && email.includes('@test.com'))
      );
    });

    console.log(`Found ${testUsers.length} test users to clean up`);

    const testUserIds = testUsers.map(u => u.id);

    // COMPREHENSIVE CLEANUP: Delete all test-related records in correct order
    if (testUserIds.length > 0) {
      console.log('🧹 Starting comprehensive cleanup...');
      
      // 1. Delete notifications for test users
      console.log('🧹 Deleting notifications...');
      const { error: notificationsError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .in('user_id', testUserIds);
      
      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError);
      } else {
        console.log('✅ Deleted notifications');
      }
      
      // 2. Delete notification preferences
      console.log('🧹 Deleting notification preferences...');
      const { error: preferencesError } = await supabaseAdmin
        .from('notification_preferences')
        .delete()
        .in('user_id', testUserIds);
      
      if (preferencesError) {
        console.error('Error deleting notification preferences:', preferencesError);
      } else {
        console.log('✅ Deleted notification preferences');
      }
      
      // 3. Delete discussion comments by test users
      console.log('🧹 Deleting discussion comments...');
      const { error: commentsError } = await supabaseAdmin
        .from('discussion_comments')
        .delete()
        .in('author_id', testUserIds);
      
      if (commentsError) {
        console.error('Error deleting discussion comments:', commentsError);
      } else {
        console.log('✅ Deleted discussion comments');
      }
      
      // 4. Delete discussion posts by test users
      console.log('🧹 Deleting discussion posts...');
      const { error: postsError } = await supabaseAdmin
        .from('discussion_posts')
        .delete()
        .in('author_id', testUserIds);
      
      if (postsError) {
        console.error('Error deleting discussion posts:', postsError);
      } else {
        console.log('✅ Deleted discussion posts');
      }
      
      // 5. Delete featured bestie hearts
      console.log('🧹 Deleting featured bestie hearts...');
      const { error: heartsError } = await supabaseAdmin
        .from('featured_bestie_hearts')
        .delete()
        .in('user_id', testUserIds);
      
      if (heartsError) {
        console.error('Error deleting featured bestie hearts:', heartsError);
      } else {
        console.log('✅ Deleted featured bestie hearts');
      }
      
      // 6. Delete featured besties for test users
      console.log('🧹 Deleting featured besties...');
      const { error: featuredBestiesError } = await supabaseAdmin
        .from('featured_besties')
        .delete()
        .in('bestie_id', testUserIds);
      
      if (featuredBestiesError) {
        console.error('Error deleting featured besties:', featuredBestiesError);
      } else {
        console.log('✅ Deleted featured besties');
      }
      
      // 7. Get vendor IDs before deleting vendor records
      const { data: vendorRecords } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .in('user_id', testUserIds);
      
      const vendorIds = vendorRecords?.map(v => v.id) || [];
      
      if (vendorIds.length > 0) {
        console.log(`Found ${vendorIds.length} vendor records to clean up`);
        
        // 8. Delete vendor bestie assets
        console.log('🧹 Deleting vendor bestie assets...');
        const { error: assetsError } = await supabaseAdmin
          .from('vendor_bestie_assets')
          .delete()
          .in('vendor_id', vendorIds);
        
        if (assetsError) {
          console.error('Error deleting vendor bestie assets:', assetsError);
        } else {
          console.log('✅ Deleted vendor bestie assets');
        }
        
        // 9. Delete vendor bestie requests
        console.log('🧹 Deleting vendor bestie requests...');
        const { error: requestsError } = await supabaseAdmin
          .from('vendor_bestie_requests')
          .delete()
          .in('vendor_id', vendorIds);
        
        if (requestsError) {
          console.error('Error deleting vendor bestie requests:', requestsError);
        } else {
          console.log('✅ Deleted vendor bestie requests');
        }
        
        // 10. Delete vendors
        console.log('🧹 Deleting vendors...');
        const { error: vendorsError } = await supabaseAdmin
          .from('vendors')
          .delete()
          .in('id', vendorIds);
        
        if (vendorsError) {
          console.error('Error deleting vendors:', vendorsError);
        } else {
          console.log('✅ Deleted vendors');
        }
      }
      
      // 11. Delete sponsorships (explicit deletion safer than relying on cascade)
      console.log('🧹 Deleting sponsorships...');
      const { error: sponsorshipsError } = await supabaseAdmin
        .from('sponsorships')
        .delete()
        .or(`sponsor_id.in.(${testUserIds.join(',')}),bestie_id.in.(${testUserIds.join(',')})`);
      
      if (sponsorshipsError) {
        console.error('Error deleting sponsorships:', sponsorshipsError);
      } else {
        console.log('✅ Deleted sponsorships');
      }
      
      // 12. Delete sponsor_besties records (CRITICAL - blocks user deletion)
      console.log('🧹 Deleting sponsor_besties records...');
      const { error: sponsorBestiesError } = await supabaseAdmin
        .from('sponsor_besties')
        .delete()
        .in('bestie_id', testUserIds);
      
      if (sponsorBestiesError) {
        console.error('Error deleting sponsor_besties:', sponsorBestiesError);
      } else {
        console.log('✅ Deleted sponsor_besties records');
      }
      
      // 13. Delete guardian-bestie links
      console.log('🧹 Deleting guardian-bestie links...');
      const { error: linksError } = await supabaseAdmin
        .from('caregiver_bestie_links')
        .delete()
        .or(`caregiver_id.in.(${testUserIds.join(',')}),bestie_id.in.(${testUserIds.join(',')})`);
      
      if (linksError) {
        console.error('Error deleting guardian-bestie links:', linksError);
      } else {
        console.log('✅ Deleted guardian-bestie links');
      }
      
      console.log('✅ Completed comprehensive pre-user deletion cleanup');
    }

    // Delete each test user (cascade will handle remaining related data)
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
