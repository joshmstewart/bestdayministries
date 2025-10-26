/**
 * Global setup that runs ONCE before ALL tests start
 * 
 * Polyfills import.meta.env for Node.js test environment
 * This allows the auto-generated Supabase client.ts to work in tests
 * 
 * Also creates persistent test accounts needed for E2E tests
 */

import { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

async function globalSetup(config: FullConfig) {
  console.log('\n🔧 Setting up global test environment...');
  
  // Polyfill import.meta for Node.js environment
  // The auto-generated Supabase client uses import.meta.env which doesn't exist in Node.js
  if (typeof globalThis.import === 'undefined') {
    // @ts-ignore
    globalThis.import = {};
  }
  
  // @ts-ignore
  if (typeof globalThis.import.meta === 'undefined') {
    // @ts-ignore
    globalThis.import.meta = {
      env: {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID,
      }
    };
  }
  
  console.log('✅ Import.meta polyfill complete');
  
  // Create persistent test account for contact-form-notifications tests
  await createPersistentTestAccount();
  
  // CRITICAL: Ensure all test accounts have daily scratch cards
  await ensureScratchCards();
  
  console.log('✅ Global setup complete\n');
}

async function createPersistentTestAccount() {
  console.log('🔐 Setting up persistent test accounts for all shards...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const testPassword = 'testpassword123';
  
  // Create accounts for shards 0-6 to match test-accounts.ts pattern
  // Shard 0: test@example.com (local testing default)
  // Shards 1-6: test1@example.com through test6@example.com
  const shards = [0, 1, 2, 3, 4, 5, 6];
  
  for (const shardNum of shards) {
    const testEmail = shardNum === 0 ? 'test@example.com' : `test${shardNum}@example.com`;
    const displayName = shardNum === 0 ? 'Test Admin User' : `Test Admin User ${shardNum}`;
    
    try {
      // Try to sign in first to check if account exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      if (signInData?.user) {
        console.log(`✅ Account exists: ${testEmail} (shard ${shardNum})`);
        
        // Verify admin role exists
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', signInData.user.id)
          .eq('role', 'admin')
          .single();
        
        if (!roleData) {
          console.log(`⚠️  Admin role missing for ${testEmail}, attempting to add via edge function...`);
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/set-test-admin-roles`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userIds: [signInData.user.id] })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Edge function failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`📋 Edge function response:`, JSON.stringify(result));
            
            // CRITICAL: Wait for database transaction to commit
            console.log(`⏳ Waiting 2 seconds for role to propagate...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // VERIFY the role was written
            const { data: roleCheck, error: verifyError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', signInData.user.id)
              .eq('role', 'admin')
              .single();
            
            if (verifyError || !roleCheck) {
              throw new Error(
                `❌ ROLE VERIFICATION FAILED for ${testEmail}\n` +
                `Error: ${verifyError?.message || 'Role not found'}\n` +
                `Response: ${JSON.stringify(result)}`
              );
            }
            
            console.log(`✅ VERIFIED admin role exists for ${testEmail}`);
          } catch (error) {
            console.error(`❌ Error setting admin role for ${testEmail}:`, error);
          }
        }
        
        // Sign out before next account
        await supabase.auth.signOut();
        continue;
      }
      
      // Account doesn't exist, create it
      console.log(`📝 Creating account: ${testEmail} (shard ${shardNum})...`);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            name: displayName,
          },
          emailRedirectTo: `${supabaseUrl}/`
        }
      });
      
      if (signUpError) {
        console.error(`❌ Failed to create ${testEmail}:`, signUpError.message);
        continue;
      }
      
      if (signUpData?.user) {
        console.log(`✅ Created account: ${testEmail} (shard ${shardNum})`);
        
        // Call edge function to set admin role (bypasses RLS)
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/set-test-admin-roles`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds: [signUpData.user.id] })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edge function failed: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log(`📋 Edge function response:`, JSON.stringify(result));
          
          // CRITICAL: Wait for database transaction to commit
          console.log(`⏳ Waiting 2 seconds for role to propagate...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // VERIFY the role was written
          const { data: roleCheck, error: verifyError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', signUpData.user.id)
            .eq('role', 'admin')
            .single();
          
          if (verifyError || !roleCheck) {
            throw new Error(
              `❌ ROLE VERIFICATION FAILED for ${testEmail}\n` +
              `Error: ${verifyError?.message || 'Role not found'}\n` +
              `Response: ${JSON.stringify(result)}`
            );
          }
          
          console.log(`✅ VERIFIED admin role exists for ${testEmail}`);
        } catch (error) {
          console.error(`❌ Error setting admin role for ${testEmail}:`, error);
        }
      }
      
      // Sign out before next account
      await supabase.auth.signOut();
      
    } catch (error) {
      console.error(`❌ Error setting up ${testEmail}:`, error);
    }
  }
  
  console.log('✅ All shard test accounts processed');
}

// Create daily scratch cards for ALL test accounts
async function ensureScratchCards() {
  console.log('🎴 Ensuring daily scratch cards for all test accounts...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Get Christmas 2025 collection
  const { data: collection, error: collectionError } = await supabase
    .from('sticker_collections')
    .select('id, name')
    .eq('name', 'Christmas 2025')
    .eq('is_active', true)
    .single();
  
  if (collectionError || !collection) {
    console.warn('⚠️  Christmas 2025 collection not found - sticker tests may fail');
    return;
  }
  
  console.log(`✅ Found collection: ${collection.name} (${collection.id})`);
  
  const today = new Date().toISOString().split('T')[0];
  const shards = [0, 1, 2, 3, 4, 5, 6];
  
  for (const shardNum of shards) {
    const testEmail = shardNum === 0 ? 'test@example.com' : `test${shardNum}@example.com`;
    
    try {
      // Sign in to get user ID
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'testpassword123',
      });
      
      if (!authData?.user) {
        console.warn(`⚠️  Could not sign in as ${testEmail}`);
        continue;
      }
      
      // Check if card exists
      const { data: existingCard } = await supabase
        .from('daily_scratch_cards')
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('collection_id', collection.id)
        .eq('date', today)
        .maybeSingle();
      
      if (existingCard) {
        console.log(`✅ Card exists for ${testEmail}`);
      } else {
        // Create card
        const { error: cardError } = await supabase
          .from('daily_scratch_cards')
          .insert({
            user_id: authData.user.id,
            collection_id: collection.id,
            date: today,
            is_bonus_card: false,
            is_scratched: false,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
        
        if (cardError) {
          console.error(`❌ Failed to create card for ${testEmail}:`, cardError.message);
        } else {
          console.log(`✅ Created card for ${testEmail}`);
        }
      }
      
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error(`❌ Error for ${testEmail}:`, error.message);
    }
  }
  
  console.log('✅ Scratch card setup complete');
  
  // Ensure Christmas 2025 collection exists for sticker pack tests
  await ensureChristmasCollection(supabase);
}

async function ensureChristmasCollection(supabase: any) {
  console.log('🎄 Ensuring Christmas 2025 sticker collection exists...');
  
  try {
    // Check if collection exists
    const { data: existingCollection } = await supabase
      .from('sticker_collections')
      .select('id')
      .eq('name', 'Christmas 2025')
      .maybeSingle();
    
    if (existingCollection) {
      console.log('✅ Christmas 2025 collection already exists');
      return;
    }
    
    // Create the collection
    const { data: newCollection, error: collectionError } = await supabase
      .from('sticker_collections')
      .insert({
        name: 'Christmas 2025',
        description: 'Festive holiday stickers for the 2025 season',
        is_active: true,
        release_date: new Date().toISOString(),
      })
      .select('id')
      .single();
    
    if (collectionError) {
      console.error('❌ Failed to create Christmas 2025 collection:', collectionError.message);
      return;
    }
    
    console.log('✅ Created Christmas 2025 collection');
    
    // Create at least one sticker in the collection
    const { error: stickerError } = await supabase
      .from('stickers')
      .insert({
        collection_id: newCollection.id,
        name: 'Christmas Tree',
        rarity: 'common',
        image_url: '/placeholder.svg',
      });
    
    if (stickerError) {
      console.error('❌ Failed to create sticker:', stickerError.message);
    } else {
      console.log('✅ Created sample sticker for Christmas 2025 collection');
    }
  } catch (error: any) {
    console.error('❌ Error ensuring Christmas collection:', error.message);
  }
}

export default globalSetup;
