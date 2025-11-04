/**
 * Test Helper Utilities
 * 
 * Provides safe, authenticated Supabase client creation for E2E tests
 * to prevent accidentally using real user accounts in test data seeding.
 */

import { createClient } from '@supabase/supabase-js';
import { getTestAccount, verifyTestAccount } from '../fixtures/test-accounts';

/**
 * Create an authenticated Supabase client for testing
 * 
 * This function:
 * 1. Creates a Supabase client
 * 2. Authenticates with test account credentials
 * 3. Verifies the account is actually a test account
 * 4. Returns the authenticated client
 * 
 * ALWAYS use this instead of creating unauthenticated clients
 * to prevent test data from being created under real user IDs.
 * 
 * @returns Authenticated Supabase client ready for test data operations
 * @throws Error if authentication fails or account is not a test account
 * 
 * @example
 * ```typescript
 * import { createAuthenticatedTestClient } from '../utils/test-helpers';
 * 
 * test.beforeAll(async () => {
 *   const supabase = await createAuthenticatedTestClient();
 *   
 *   // Safe to use immediately - guaranteed to be test account
 *   const { data: { user } } = await supabase.auth.getUser();
 *   
 *   await supabase.from('discussion_posts').insert({
 *     author_id: user.id, // Will be a test account ID
 *     title: 'Test Post'
 *   });
 * });
 * ```
 */
export async function createAuthenticatedTestClient() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );
  
  const testAccount = getTestAccount();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testAccount.email,
    password: testAccount.password,
  });
  
  if (signInError) {
    throw new Error(`Failed to authenticate test client: ${signInError.message}`);
  }
  
  // Verify we're using a test account (prevents real user data corruption)
  const { data: { session } } = await supabase.auth.getSession();
  verifyTestAccount(session?.user?.email);
  
  console.log(`✅ Authenticated test client as ${session?.user?.email}`);
  
  return supabase;
}
