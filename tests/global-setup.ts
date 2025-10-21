/**
 * Global setup that runs ONCE before ALL tests start
 * 
 * Polyfills import.meta.env for Node.js test environment
 * This allows the auto-generated Supabase client.ts to work in tests
 */

import { FullConfig } from '@playwright/test';

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
  
  console.log('✅ Global setup complete\n');
}

export default globalSetup;
