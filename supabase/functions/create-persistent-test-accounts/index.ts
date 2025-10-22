import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PERSISTENT TEST ACCOUNTS - EXPANDED FOR PARALLEL SHARDS
 * These accounts are used for testing different user experiences and should NEVER be deleted.
 * Now includes shard-specific accounts (test1-test6) for CI parallel execution.
 */
const PERSISTENT_TEST_ACCOUNTS = [
  // Original default accounts (local testing)
  {
    email: 'test@example.com',
    password: 'testpassword123',
    displayName: 'Test User',
    role: 'supporter',
    avatarNumber: 1
  },
  {
    email: 'testbestie@example.com',
    password: 'testpassword123',
    displayName: 'Test Bestie',
    role: 'bestie',
    avatarNumber: 2
  },
  {
    email: 'testguardian@example.com',
    password: 'testpassword123',
    displayName: 'Test Guardian',
    role: 'caregiver',
    avatarNumber: 3
  },
  {
    email: 'testsupporter@example.com',
    password: 'testpassword123',
    displayName: 'Test Supporter',
    role: 'supporter',
    avatarNumber: 4
  },
  // Shard 1 accounts
  {
    email: 'test1@example.com',
    password: 'testpassword123',
    displayName: 'Test User 1',
    role: 'supporter',
    avatarNumber: 1
  },
  {
    email: 'testbestie1@example.com',
    password: 'testpassword123',
    displayName: 'Test Bestie 1',
    role: 'bestie',
    avatarNumber: 2
  },
  {
    email: 'testguardian1@example.com',
    password: 'testpassword123',
    displayName: 'Test Guardian 1',
    role: 'caregiver',
    avatarNumber: 3
  },
  {
    email: 'testsupporter1@example.com',
    password: 'testpassword123',
    displayName: 'Test Supporter 1',
    role: 'supporter',
    avatarNumber: 4
  },
  // Shard 2 accounts
  {
    email: 'test2@example.com',
    password: 'testpassword123',
    displayName: 'Test User 2',
    role: 'supporter',
    avatarNumber: 1
  },
  {
    email: 'testbestie2@example.com',
    password: 'testpassword123',
    displayName: 'Test Bestie 2',
    role: 'bestie',
    avatarNumber: 2
  },
  {
    email: 'testguardian2@example.com',
    password: 'testpassword123',
    displayName: 'Test Guardian 2',
    role: 'caregiver',
    avatarNumber: 3
  },
  {
    email: 'testsupporter2@example.com',
    password: 'testpassword123',
    displayName: 'Test Supporter 2',
    role: 'supporter',
    avatarNumber: 4
  },
  // Shard 3 accounts
  {
    email: 'test3@example.com',
    password: 'testpassword123',
    displayName: 'Test User 3',
    role: 'supporter',
    avatarNumber: 1
  },
  {
    email: 'testbestie3@example.com',
    password: 'testpassword123',
    displayName: 'Test Bestie 3',
    role: 'bestie',
    avatarNumber: 2
  },
  {
    email: 'testguardian3@example.com',
    password: 'testpassword123',
    displayName: 'Test Guardian 3',
    role: 'caregiver',
    avatarNumber: 3
  },
  {
    email: 'testsupporter3@example.com',
    password: 'testpassword123',
    displayName: 'Test Supporter 3',
    role: 'supporter',
    avatarNumber: 4
  },
  // Shard 4 accounts
  {
    email: 'test4@example.com',
    password: 'testpassword123',
    displayName: 'Test User 4',
    role: 'supporter',
    avatarNumber: 1
  },
  {
    email: 'testbestie4@example.com',
    password: 'testpassword123',
    displayName: 'Test Bestie 4',
    role: 'bestie',
    avatarNumber: 2
  },
  {
    email: 'testguardian4@example.com',
    password: 'testpassword123',
    displayName: 'Test Guardian 4',
    role: 'caregiver',
    avatarNumber: 3
  },
  {
    email: 'testsupporter4@example.com',
    password: 'testpassword123',
    displayName: 'Test Supporter 4',
    role: 'supporter',
    avatarNumber: 4
  },
  // Shard 5 accounts
  {
    email: 'test5@example.com',
    password: 'testpassword123',
    displayName: 'Test User 5',
    role: 'supporter',
    avatarNumber: 1
  },
  {
    email: 'testbestie5@example.com',
    password: 'testpassword123',
    displayName: 'Test Bestie 5',
    role: 'bestie',
    avatarNumber: 2
  },
  {
    email: 'testguardian5@example.com',
    password: 'testpassword123',
    displayName: 'Test Guardian 5',
    role: 'caregiver',
    avatarNumber: 3
  },
  {
    email: 'testsupporter5@example.com',
    password: 'testpassword123',
    displayName: 'Test Supporter 5',
    role: 'supporter',
    avatarNumber: 4
  },
  // Shard 6 accounts
  {
    email: 'test6@example.com',
    password: 'testpassword123',
    displayName: 'Test User 6',
    role: 'supporter',
    avatarNumber: 1
  },
  {
    email: 'testbestie6@example.com',
    password: 'testpassword123',
    displayName: 'Test Bestie 6',
    role: 'bestie',
    avatarNumber: 2
  },
  {
    email: 'testguardian6@example.com',
    password: 'testpassword123',
    displayName: 'Test Guardian 6',
    role: 'caregiver',
    avatarNumber: 3
  },
  {
    email: 'testsupporter6@example.com',
    password: 'testpassword123',
    displayName: 'Test Supporter 6',
    role: 'supporter',
    avatarNumber: 4
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Creating/verifying persistent test accounts (including shard-specific accounts)...');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const results = [];

    for (const account of PERSISTENT_TEST_ACCOUNTS) {
      try {
        // Check if user exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === account.email);

        let userId: string;

        if (existingUser) {
          console.log(`✅ Account exists: ${account.email}`);
          userId = existingUser.id;
          results.push({ email: account.email, status: 'exists', userId });
        } else {
          // Create new user
          console.log(`🔨 Creating account: ${account.email}`);
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
            user_metadata: {
              display_name: account.displayName,
              role: account.role,
              avatar_url: `avatar-${account.avatarNumber}`
            }
          });

          if (createError) {
            console.error(`❌ Error creating ${account.email}:`, createError);
            results.push({ email: account.email, status: 'error', error: createError.message });
            continue;
          }

          if (!newUser.user) {
            console.error(`❌ No user returned for ${account.email}`);
            results.push({ email: account.email, status: 'error', error: 'No user returned' });
            continue;
          }

          userId = newUser.user.id;
          console.log(`✅ Created user: ${account.email} (${userId})`);
        }

        // Ensure profile exists with correct data
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            display_name: account.displayName,
            email: account.email,
            avatar_number: account.avatarNumber,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error(`❌ Error upserting profile for ${account.email}:`, profileError);
        } else {
          console.log(`✅ Profile ensured for ${account.email}`);
        }

        // Ensure role exists
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: account.role,
            created_by: userId
          }, {
            onConflict: 'user_id,role'
          });

        if (roleError) {
          console.error(`❌ Error ensuring role for ${account.email}:`, roleError);
        } else {
          console.log(`✅ Role ensured for ${account.email}: ${account.role}`);
        }

        if (!existingUser) {
          results.push({ email: account.email, status: 'created', userId });
        }

      } catch (error) {
        console.error(`❌ Error processing ${account.email}:`, error);
        results.push({ 
          email: account.email, 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log('✅ Persistent test accounts verification complete');
    console.log(`📊 Total accounts: ${PERSISTENT_TEST_ACCOUNTS.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Persistent test accounts created/verified (including shard-specific accounts)',
        totalAccounts: PERSISTENT_TEST_ACCOUNTS.length,
        results 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in create-persistent-test-accounts:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to create/verify persistent test accounts'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
