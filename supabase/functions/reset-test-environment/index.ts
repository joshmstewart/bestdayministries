import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting test environment reset...');

    // Create admin client with service role key (bypasses RLS)
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

    // Check if user is admin (required for this operation)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'owner');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    // Delete test data (patterns: Test*, E2E*, emailtest*)
    console.log('🗑️  Deleting test users...');
    
    // Get test user IDs from profiles
    const { data: testProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or('display_name.ilike.%Test%,display_name.ilike.%E2E%,email.ilike.emailtest%');

    const testUserIds = testProfiles?.map(p => p.id) || [];

    if (testUserIds.length > 0) {
      // Delete users via auth admin API (cascades to all related tables)
      for (const userId of testUserIds) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.warn(`Failed to delete user ${userId}:`, deleteError.message);
        }
      }
      console.log(`✅ Deleted ${testUserIds.length} test users`);
    }

    // Delete test sticker collections
    console.log('🗑️  Deleting test sticker collections...');
    const { error: stickerError } = await supabaseAdmin
      .from('sticker_collections')
      .delete()
      .ilike('name', '%Test%');
    
    if (stickerError) {
      console.warn('Sticker collection cleanup warning:', stickerError.message);
    }

    // Seed realistic data
    console.log('🌱 Seeding realistic test data...');

    const seededData: {
      guardians: string[];
      besties: string[];
      sponsors: string[];
      discussions: string[];
      stickerCollections: string[];
    } = {
      guardians: [],
      besties: [],
      sponsors: [],
      discussions: [],
      stickerCollections: []
    };

    // Create 2 guardians with linked besties
    for (let i = 1; i <= 2; i++) {
      const guardianEmail = `testguardian${i}@example.com`;
      const bestieEmail = `testbestie${i}@example.com`;

      // Check if users already exist
      const { data: existingGuardian } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', guardianEmail)
        .single();

      if (!existingGuardian) {
        const { data: guardianAuth } = await supabaseAdmin.auth.admin.createUser({
          email: guardianEmail,
          password: 'testpassword123',
          email_confirm: true,
          user_metadata: {
            display_name: `Test Guardian ${i}`,
            role: 'caregiver'
          }
        });

        if (guardianAuth?.user) {
          seededData.guardians.push(guardianAuth.user.id);

          const { data: bestieAuth } = await supabaseAdmin.auth.admin.createUser({
            email: bestieEmail,
            password: 'testpassword123',
            email_confirm: true,
            user_metadata: {
              display_name: `Test Bestie ${i}`,
              role: 'bestie'
            }
          });

          if (bestieAuth?.user) {
            seededData.besties.push(bestieAuth.user.id);

            // Link guardian and bestie
            await supabaseAdmin
              .from('caregiver_bestie_links')
              .insert({
                caregiver_id: guardianAuth.user.id,
                bestie_id: bestieAuth.user.id,
                require_post_approval: i === 1, // First guardian requires approval
                require_comment_approval: false
              });
          }
        }
      }
    }

    // Create 1 sponsor with active sponsorship
    const sponsorEmail = 'testsponsor@example.com';
    const { data: existingSponsor } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', sponsorEmail)
      .single();

    if (!existingSponsor && seededData.besties.length > 0) {
      const { data: sponsorAuth } = await supabaseAdmin.auth.admin.createUser({
        email: sponsorEmail,
        password: 'testpassword123',
        email_confirm: true,
        user_metadata: {
          display_name: 'Test Sponsor',
          role: 'supporter'
        }
      });

      if (sponsorAuth?.user) {
        seededData.sponsors.push(sponsorAuth.user.id);

        // Create sponsor_bestie
        const { data: sponsorBestie } = await supabaseAdmin
          .from('sponsor_besties')
          .insert({
            bestie_id: seededData.besties[0],
            bestie_name: 'Test Bestie 1',
            is_active: true,
            is_public: true,
            monthly_goal: 100,
            approval_status: 'approved',
            image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
            aspect_ratio: '1:1',
            created_by: sponsorAuth.user.id
          })
          .select()
          .single();

        if (sponsorBestie) {
          // Create active sponsorship
          await supabaseAdmin
            .from('sponsorships')
            .insert({
              sponsor_id: sponsorAuth.user.id,
              bestie_id: seededData.besties[0],
              sponsor_bestie_id: sponsorBestie.id,
              amount: 25,
              frequency: 'monthly',
              status: 'active',
              stripe_mode: 'test',
              started_at: new Date().toISOString(),
              stripe_customer_id: `test_cus_${Date.now()}`,
              stripe_subscription_id: `test_sub_${Date.now()}`
            });
        }
      }
    }

    // Create 3 discussion posts
    if (seededData.guardians.length > 0) {
      for (let i = 1; i <= 3; i++) {
        const { data: post } = await supabaseAdmin
          .from('discussion_posts')
          .insert({
            author_id: seededData.guardians[0],
            title: `Test Discussion ${i}`,
            content: `This is test content for discussion post ${i}. It provides a realistic example of community content.`,
            approval_status: i === 1 ? 'pending_approval' : 'approved',
            is_moderated: true
          })
          .select()
          .single();

        if (post) {
          seededData.discussions.push(post.id);
        }
      }
    }

    // Create 1 sticker collection with 5 stickers
    const { data: collection } = await supabaseAdmin
      .from('sticker_collections')
      .insert({
        name: 'Test Sticker Collection',
        description: 'A test collection for development and testing',
        is_active: true,
        start_date: new Date().toISOString().split('T')[0],
        rarity_config: {
          common: 50,
          uncommon: 30,
          rare: 15,
          epic: 4,
          legendary: 1
        }
      })
      .select()
      .single();

    if (collection) {
      seededData.stickerCollections.push(collection.id);

      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      for (let i = 0; i < 5; i++) {
        await supabaseAdmin
          .from('stickers')
          .insert({
            collection_id: collection.id,
            name: `Test Sticker ${i + 1}`,
            rarity: rarities[i],
            image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
            is_active: true
          });
      }
    }

    console.log('✅ Test environment reset complete!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test environment reset successfully',
        summary: {
          deleted: {
            users: testUserIds.length
          },
          seeded: {
            guardians: seededData.guardians.length,
            besties: seededData.besties.length,
            sponsors: seededData.sponsors.length,
            discussions: seededData.discussions.length,
            stickerCollections: seededData.stickerCollections.length
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ Error resetting test environment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
