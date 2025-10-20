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
    console.log('🌱 Starting email test data seeding...');
    
    // Track critical errors that should cause seeding to fail
    const criticalErrors: string[] = [];

    const { 
      testRunId = 'default',
      includeAdmin = false 
    } = await req.json();
    const emailPrefix = `emailtest-${testRunId}`;

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Step 1: Create test users
    console.log('📝 Creating test users...');
    
    const testUsers: Record<string, { email: string; password: string; role: string }> = {
      guardian: {
        email: `${emailPrefix}-guardian@test.com`,
        password: 'TestPassword123!',
        role: 'caregiver'
      },
      bestie: {
        email: `${emailPrefix}-bestie@test.com`,
        password: 'TestPassword123!',
        role: 'bestie'
      },
      sponsor: {
        email: `${emailPrefix}-sponsor@test.com`,
        password: 'TestPassword123!',
        role: 'supporter'
      },
      vendor: {
        email: `${emailPrefix}-vendor@test.com`,
        password: 'TestPassword123!',
        role: 'supporter'
      }
    };

    // Conditionally add admin user
    if (includeAdmin) {
      testUsers.admin = {
        email: `${emailPrefix}-admin@test.com`,
        password: 'TestPassword123!',
        role: 'admin'
      };
    }

    const userIds: Record<string, string> = {};

    for (const [key, userData] of Object.entries(testUsers)) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          display_name: `Test ${key.charAt(0).toUpperCase() + key.slice(1)}`,
          role: userData.role
        }
      });

      if (authError) {
        console.error(`Error creating ${key}:`, authError);
        throw authError;
      }

      userIds[key] = authData.user.id;
      console.log(`✅ Created ${key}: ${authData.user.id}`);
    }

    // Step 2: Create profiles (should be auto-created by trigger, but ensure they exist)
    console.log('📝 Ensuring profiles exist...');
    
    for (const [key, userId] of Object.entries(userIds)) {
      // Generate unique 3-emoji friend code for each user
      const emojiSet = ['🎯', '🎨', '🎭', '🎪', '🌟', '🌈', '🔥', '🌊', '🌸', '🍕'];
      const friendCode = 
        emojiSet[Math.floor(Math.random() * emojiSet.length)] +
        emojiSet[Math.floor(Math.random() * emojiSet.length)] +
        emojiSet[Math.floor(Math.random() * emojiSet.length)];
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          display_name: `Test ${key.charAt(0).toUpperCase() + key.slice(1)}`,
          email: testUsers[key as keyof typeof testUsers].email,
          friend_code: friendCode
        }, { onConflict: 'id' });

      if (profileError) {
        console.error(`Error creating profile for ${key}:`, profileError);
      }
    }

    // Step 3: Create user roles
    console.log('📝 Creating user roles...');
    
    const roles = [
      { user_id: userIds.guardian, role: 'caregiver', created_by: userIds.guardian },
      { user_id: userIds.bestie, role: 'bestie', created_by: userIds.bestie },
      { user_id: userIds.sponsor, role: 'supporter', created_by: userIds.sponsor },
      { user_id: userIds.vendor, role: 'supporter', created_by: userIds.vendor }
    ];

    // Add admin role if admin user was created
    if (includeAdmin && userIds.admin) {
      roles.push({ user_id: userIds.admin, role: 'admin', created_by: userIds.admin });
    }

    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .upsert(roles, { onConflict: 'user_id,role', ignoreDuplicates: true });

    if (rolesError) {
      console.error('Error creating roles:', rolesError);
    }

    // Step 4: Create guardian-bestie link
    console.log('📝 Creating guardian-bestie link...');
    
    const { data: guardianLink, error: linkError } = await supabaseAdmin
      .from('caregiver_bestie_links')
      .insert({
        caregiver_id: userIds.guardian,
        bestie_id: userIds.bestie,
        relationship: 'parent',
        require_post_approval: true,
        require_comment_approval: true,
        require_message_approval: true,
        require_vendor_asset_approval: true,
        allow_featured_posts: true,
        allow_sponsor_messages: true
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error creating guardian link:', linkError);
      throw linkError;
    }

    console.log('✅ Created guardian-bestie link');

    // Step 5: Create featured bestie
    console.log('📝 Creating featured bestie...');
    
    const { data: featuredBestie, error: featuredError } = await supabaseAdmin
      .from('featured_besties')
      .insert({
        bestie_id: userIds.bestie,
        bestie_name: 'Test Bestie',
        description: 'Test featured bestie for email testing',
        image_url: 'https://example.com/test.jpg',
        approval_status: 'approved',
        is_active: true,
        available_for_sponsorship: true,
        monthly_goal: 100
      })
      .select()
      .single();

    if (featuredError) {
      console.error('Error creating featured bestie:', featuredError);
    }

    // Step 6: Create sponsor-bestie relationship
    console.log('📝 Creating sponsor-bestie relationship...');
    
    const { data: sponsorBestie, error: sponsorBestieError } = await supabaseAdmin
      .from('sponsor_besties')
      .insert({
        bestie_id: userIds.bestie,
        bestie_name: 'Test Bestie',
        image_url: 'https://example.com/test.jpg',
        aspect_ratio: '9:16',
        monthly_goal: 100,
        is_active: true,
        is_fully_funded: false,
        created_by: userIds.guardian,
        approval_status: 'approved',
        is_public: true,
        text_sections: {
          intro: 'Test bestie for email testing'
        }
      })
      .select()
      .single();

    if (sponsorBestieError) {
      console.error('Error creating sponsor-bestie:', sponsorBestieError);
      throw sponsorBestieError;
    }

    // Step 7: Create sponsorships
    console.log('📝 Creating sponsorships...');
    
    // Delete any existing sponsorships for this sponsor/bestie combo to avoid unique constraint violations
    await supabaseAdmin
      .from('sponsorships')
      .delete()
      .eq('sponsor_id', userIds.sponsor)
      .eq('sponsor_bestie_id', sponsorBestie.id);
    
    const { data: monthlySponsorship, error: monthlyError } = await supabaseAdmin
      .from('sponsorships')
      .insert({
        sponsor_id: userIds.sponsor,
        bestie_id: userIds.bestie,
        sponsor_bestie_id: sponsorBestie.id,
        amount: 50,
        frequency: 'monthly',
        status: 'active',
        stripe_subscription_id: `sub_test_monthly_${testRunId || 'default'}`,
        stripe_customer_id: `cus_test_${testRunId || 'default'}`,
        stripe_mode: 'test'
      })
      .select()
      .single();

    if (monthlyError) {
      console.error('Error creating monthly sponsorship:', monthlyError);
      throw monthlyError;
    }

    const { data: oneTimeSponsorship, error: oneTimeError } = await supabaseAdmin
      .from('sponsorships')
      .insert({
        sponsor_id: userIds.sponsor,
        bestie_id: userIds.bestie,
        sponsor_bestie_id: sponsorBestie.id,
        amount: 100,
        frequency: 'one-time',
        status: 'completed',
        stripe_payment_intent_id: `pi_test_onetime_${testRunId || 'default'}`,
        stripe_customer_id: `cus_test_${testRunId || 'default'}`,
        stripe_mode: 'test'
      })
      .select()
      .single();

    if (oneTimeError) {
      console.error('Error creating one-time sponsorship:', oneTimeError);
      throw oneTimeError;
    }

    console.log('✅ Created sponsorships');

    // Step 8: Create discussion content
    console.log('📝 Creating discussion content...');
    
    const { data: approvedPost, error: approvedPostError } = await supabaseAdmin
      .from('discussion_posts')
      .insert({
        author_id: userIds.guardian,
        title: 'Test Approved Post',
        content: 'This is an approved post for testing',
        approval_status: 'approved'
      })
      .select()
      .single();

    if (approvedPostError) {
      console.error('Error creating approved post:', approvedPostError);
      throw approvedPostError;
    }

    const { data: pendingPost, error: pendingPostError } = await supabaseAdmin
      .from('discussion_posts')
      .insert({
        author_id: userIds.bestie,
        title: 'Test Pending Post',
        content: 'This is a pending post for approval testing',
        approval_status: 'pending_approval'
      })
      .select()
      .single();

    if (pendingPostError) {
      console.error('Error creating pending post:', pendingPostError);
    }

    const { data: pendingComment, error: pendingCommentError } = await supabaseAdmin
      .from('discussion_comments')
      .insert({
        post_id: approvedPost.id,
        author_id: userIds.bestie,
        content: 'Test pending comment',
        approval_status: 'pending_approval'
      })
      .select()
      .single();

    if (pendingCommentError) {
      console.error('Error creating pending comment:', pendingCommentError);
    }

    console.log('✅ Created discussion content');

    // Step 9: Create vendor
    console.log('📝 Creating vendor...');
    
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .insert({
        user_id: userIds.vendor,
        business_name: 'Test Vendor Business',
        description: 'Test vendor for email testing',
        status: 'approved'
      })
      .select()
      .single();

    if (vendorError) {
      console.error('Error creating vendor:', vendorError);
      throw vendorError;
    }

    // Step 10: Create vendor-bestie request
    console.log('📝 Creating vendor-bestie request...');
    
    const { data: vendorRequest, error: vendorRequestError } = await supabaseAdmin
      .from('vendor_bestie_requests')
      .insert({
        vendor_id: vendor.id,
        bestie_id: userIds.bestie,
        status: 'approved'
      })
      .select()
      .single();

    if (vendorRequestError) {
      console.error('Error creating vendor request:', vendorRequestError);
      throw vendorRequestError;
    }

    // Step 11: Create pending vendor asset
    console.log('📝 Creating vendor asset...');
    
    const { error: assetError } = await supabaseAdmin
      .from('vendor_bestie_assets')
      .insert({
        vendor_id: vendor.id,
        bestie_id: userIds.bestie,
        vendor_bestie_request_id: vendorRequest.id,
        asset_type: 'image',
        asset_url: 'https://example.com/test-asset.jpg',
        approval_status: 'pending_approval'
      });

    if (assetError) {
      console.error('Error creating vendor asset:', assetError);
      criticalErrors.push(`Vendor asset: ${assetError.message}`);
    }

    // Step 12: Create notifications for digest tests
    console.log('📝 Creating test notifications...');
    
    const notifications = [
      {
        user_id: userIds.sponsor,
        type: 'comment_on_post',
        title: 'New Comment',
        message: 'Someone commented on your post',
        is_read: false
      },
      {
        user_id: userIds.sponsor,
        type: 'new_sponsor_message',
        title: 'New Message',
        message: 'You have a new message',
        is_read: false
      },
      {
        user_id: userIds.sponsor,
        type: 'product_update',
        title: 'Product Update',
        message: 'New product available',
        is_read: false
      }
    ];

    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
      criticalErrors.push(`Notifications: ${notifError.message}`);
    }

    // Step 13: Create notification preferences
    console.log('📝 Creating notification preferences...');
    
    const preferences = Object.values(userIds).map(userId => ({
      user_id: userId,
      enable_digest_emails: true,
      email_on_pending_approval: true,
      email_on_approval_decision: true,
      email_on_new_sponsor_message: true,
      email_on_message_approved: true,
      email_on_message_rejected: true,
      email_on_new_event: true,
      email_on_event_update: true,
      email_on_new_sponsorship: true,
      email_on_sponsorship_update: true,
      email_on_comment_on_post: true,
      email_on_comment_on_thread: true,
      email_on_product_update: true,
      inapp_on_pending_approval: true,
      inapp_on_approval_decision: true,
      inapp_on_new_sponsor_message: true,
      inapp_on_message_approved: true,
      inapp_on_message_rejected: true,
      inapp_on_new_event: true,
      inapp_on_event_update: true,
      inapp_on_new_sponsorship: true,
      inapp_on_sponsorship_update: true,
      inapp_on_comment_on_post: true,
      inapp_on_comment_on_thread: true,
      inapp_on_product_update: true,
      digest_frequency: 'daily'
    }));

    const { error: prefsError } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(preferences, { onConflict: 'user_id', ignoreDuplicates: true });

    if (prefsError) {
      console.error('Error creating preferences:', prefsError);
      criticalErrors.push(`Preferences: ${prefsError.message}`);
    }

    // Step 14: Ensure receipt settings exist (use upsert to avoid duplicates)
    console.log('📝 Ensuring receipt settings...');
    
    const testReceiptSettingsId = '11111111-1111-1111-1111-111111111111';
    
    const { error: receiptError } = await supabaseAdmin
      .from('receipt_settings')
      .upsert({
        id: testReceiptSettingsId,
        organization_name: 'Test Organization',
        organization_ein: '12-3456789',
        organization_address: '123 Test St, Test City, TS 12345',
        from_email: 'receipts@testorg.com',
        reply_to_email: 'support@testorg.com',
        receipt_message: 'Thank you for your sponsorship!',
        tax_deductible_notice: 'Your donation is tax-deductible to the extent allowed by law.'
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (receiptError) {
      console.error('Error creating receipt settings:', receiptError);
      criticalErrors.push(`Receipt settings: ${receiptError.message}`);
    }

    // Check for critical errors before returning success
    if (criticalErrors.length > 0) {
      console.error('❌ Critical errors occurred during seeding:', criticalErrors);
      throw new Error(`Seeding failed with ${criticalErrors.length} critical error(s): ${criticalErrors.join('; ')}`);
    }

    // Step 15: Generate real JWT auth tokens for tests
    console.log('🔑 Generating JWT auth tokens for tests...');
    
    const authSessions: Record<string, any> = {};
    
    for (const [key, userData] of Object.entries(testUsers)) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });
      
      if (authError || !authData.session) {
        console.error(`Error signing in ${key}:`, authError);
        criticalErrors.push(`Failed to generate JWT for ${key}: ${authError?.message}`);
      } else {
        authSessions[key] = {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token
        };
        console.log(`✅ Generated JWT tokens for ${key}`);
      }
    }

    console.log('✅ Email test data seeding complete!');
    console.log('📊 Created test users:', Object.keys(userIds));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data seeded successfully',
        userIds,
        testRunId,
        emailPrefix,
        authSessions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error seeding test data:', error);
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
