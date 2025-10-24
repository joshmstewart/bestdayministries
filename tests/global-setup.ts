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
          console.log(`⚠️  Admin role missing for ${testEmail}, attempting to add...`);
          await supabase.from('user_roles').insert({
            user_id: signInData.user.id,
            role: 'admin'
          });
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
        
        // Try to add admin role (may fail with RLS)
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: signUpData.user.id,
          role: 'admin'
        });
        
        if (roleError) {
          console.log(`⚠️  Could not add admin role for ${testEmail} (RLS protected)`);
        } else {
          console.log(`✅ Admin role added for ${testEmail}`);
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

export default globalSetup;
