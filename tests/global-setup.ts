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
  console.log('🔐 Setting up persistent test account...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';
  
  try {
    // Try to sign in first to check if account exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInData?.user) {
      console.log('✅ Persistent test account already exists');
      
      // Verify admin role exists
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', signInData.user.id)
        .eq('role', 'admin')
        .single();
      
      if (!roleData) {
        console.log('⚠️  Admin role missing, attempting to add...');
        // Note: This will likely fail with RLS, but worth trying
        await supabase.from('user_roles').insert({
          user_id: signInData.user.id,
          role: 'admin'
        });
      }
      
      // Sign out
      await supabase.auth.signOut();
      return;
    }
    
    // Account doesn't exist or password wrong, try to create
    console.log('📝 Creating persistent test account...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test Admin User',
        },
        emailRedirectTo: `${supabaseUrl}/`
      }
    });
    
    if (signUpError) {
      console.error('❌ Failed to create test account:', signUpError.message);
      return;
    }
    
    if (signUpData?.user) {
      console.log('✅ Test account created successfully');
      
      // Try to add admin role (may fail with RLS)
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: signUpData.user.id,
        role: 'admin'
      });
      
      if (roleError) {
        console.log('⚠️  Could not add admin role via client (RLS protected)');
        console.log('   Please run the edge function: create-persistent-test-accounts');
      } else {
        console.log('✅ Admin role added successfully');
      }
    }
    
    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('❌ Error setting up persistent test account:', error);
  }
}

export default globalSetup;
