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
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  console.log('[Setup] Creating/verifying persistent test accounts with SERVICE KEY...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });

  const testAccounts = [
    { 
      email: 'test@example.com', 
      password: 'testpassword123', 
      name: 'Test User',
      role: 'admin'
    },
    { 
      email: 'testbestie@example.com', 
      password: 'testpassword123', 
      name: 'Test Bestie',
      role: 'bestie'
    },
    { 
      email: 'testguardian@example.com', 
      password: 'testpassword123', 
      name: 'Test Guardian',
      role: 'caregiver'
    },
    { 
      email: 'testsupporter@example.com', 
      password: 'testpassword123', 
      name: 'Test Supporter',
      role: 'supporter'
    }
  ];

  for (const account of testAccounts) {
    try {
      console.log(`[Setup] Processing ${account.email}...`);
      
      // Try to sign in first to check if account exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      
      if (signInData?.user) {
        console.log(`[Setup] Account exists: ${account.email}`);
        
        // Check if user has required role using service key
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', signInData.user.id)
          .eq('role', account.role)
          .maybeSingle();
        
        console.log(`[Setup] Role check for ${account.email}:`, { roleData, roleError });
        
        if (!roleData) {
          console.log(`[Setup] Adding ${account.role} role directly for ${account.email}...`);
          // Add role directly using service key (bypasses RLS)
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: signInData.user.id,
              role: account.role,
              created_by: signInData.user.id
            });
          
          if (insertError) {
            console.error(`[Setup] Failed to add ${account.role} role:`, insertError);
          } else {
            console.log(`[Setup] Successfully added ${account.role} role for ${account.email}`);
          }
        } else {
          console.log(`[Setup] ${account.role} role already exists for ${account.email}`);
        }
        
        await supabase.auth.signOut();
        continue;
      }
      
      // Account doesn't exist, create it
      console.log(`[Setup] Creating account: ${account.email}...`);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            display_name: account.name,
            role: account.role
          }
        }
      });
      
      if (signUpError) {
        console.error(`[Setup] Failed to create ${account.email}:`, signUpError.message);
        continue;
      }
      
      if (signUpData?.user) {
        console.log(`[Setup] Created account: ${account.email}`);
        
        // Add role directly using service key (bypasses RLS)
        const { error: roleInsertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: signUpData.user.id,
            role: account.role,
            created_by: signUpData.user.id
          });
        
        if (roleInsertError) {
          console.error(`[Setup] Failed to add ${account.role} role:`, roleInsertError);
        } else {
          console.log(`[Setup] Successfully added ${account.role} role for ${account.email}`);
        }
      }
      
      await supabase.auth.signOut();
      
    } catch (error) {
      console.error(`[Setup] Error setting up ${account.email}:`, error);
    }
  }
  
  console.log('[Setup] All persistent test accounts processed');
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
  console.log('[Setup] Ensuring Christmas 2025 collection exists with stickers...');
  
  try {
    // Check if collection exists
    const { data: existingCollection, error: checkError } = await supabase
      .from('sticker_collections')
      .select('id, name')
      .eq('name', 'Christmas 2025')
      .maybeSingle();
    
    if (checkError) {
      console.error('[Setup] Error checking for collection:', checkError);
    }
    
    if (existingCollection) {
      console.log('[Setup] Christmas 2025 collection already exists:', existingCollection);
      
      // Verify it has stickers
      const { data: stickers, error: stickerCheckError } = await supabase
        .from('stickers')
        .select('id')
        .eq('collection_id', existingCollection.id);
      
      if (!stickerCheckError && stickers && stickers.length > 0) {
        console.log(`[Setup] Collection has ${stickers.length} stickers`);
        return existingCollection.id;
      }
      
      console.log('[Setup] Collection exists but has no stickers, will add them...');
    }
    
    // Create or get collection
    let collectionId = existingCollection?.id;
    
    if (!collectionId) {
      console.log('[Setup] Creating Christmas 2025 collection...');
      const { data: collection, error: collectionError } = await supabase
        .from('sticker_collections')
        .insert({
          name: 'Christmas 2025',
          description: 'Holiday stickers for testing',
          is_active: true,
          visible_to_roles: ['admin', 'owner', 'supporter', 'bestie', 'caregiver'],
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
      
      if (collectionError) {
        console.error('[Setup] Failed to create collection:', collectionError);
        throw collectionError;
      }
      
      console.log('[Setup] Created collection:', collection);
      collectionId = collection.id;
    }
    
    // Create sample stickers (at least 5 for variety)
    const stickers = [
      { name: 'Snowflake', rarity: 'common' },
      { name: 'Santa Hat', rarity: 'uncommon' },
      { name: 'Reindeer', rarity: 'rare' },
      { name: 'Christmas Tree', rarity: 'epic' },
      { name: 'Golden Star', rarity: 'legendary' }
    ];
    
    for (const sticker of stickers) {
      const { error: stickerError } = await supabase
        .from('stickers')
        .insert({
          collection_id: collectionId,
          name: sticker.name,
          rarity: sticker.rarity,
          image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
          is_active: true
        });
      
      if (stickerError) {
        console.error(`[Setup] Failed to create sticker ${sticker.name}:`, stickerError);
      } else {
        console.log(`[Setup] Created sticker: ${sticker.name}`);
      }
    }
    
    console.log('[Setup] Christmas 2025 collection setup complete with stickers');
    return collectionId;
  } catch (error: any) {
    console.error('[Setup] Error ensuring Christmas collection:', error.message);
    throw error;
  }
}

export default globalSetup;
