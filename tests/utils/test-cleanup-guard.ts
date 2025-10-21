/**
 * CRITICAL: Test Cleanup Guard
 * 
 * This utility ensures test data is ALWAYS cleaned up, even if tests fail.
 * It's designed to prevent test data (especially sponsor besties) from appearing in production.
 * 
 * PRIORITY: Clean production data > Test pass rate
 * It's better to have clean production than passing tests with leaked data.
 */

import { Page } from '@playwright/test';

interface CleanupGuardOptions {
  /**
   * Name patterns to match for cleanup (e.g., ['Test', 'E2E'])
   */
  namePatterns?: string[];
  
  /**
   * Email prefix for cleanup (e.g., 'emailtest-')
   */
  emailPrefix?: string;
  
  /**
   * Maximum retry attempts if cleanup fails
   */
  maxRetries?: number;
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
}

/**
 * Execute cleanup with retries to ensure test data is removed
 */
export async function executeCleanupWithRetry(
  page: Page, 
  options: CleanupGuardOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const {
    namePatterns = ['Test', 'E2E', 'test', 'e2e'],
    emailPrefix,
    maxRetries = 3,
    retryDelay = 2000
  } = options;

  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🧹 Cleanup attempt ${attempt}/${maxRetries}...`);
    
    try {
      const result = await page.evaluate(async ({ patterns, prefix }) => {
        try {
          // @ts-ignore - Supabase is globally available
          const { supabase } = await import('/src/integrations/supabase/client.ts');
          
          const body: any = {};
          if (patterns.length > 0) body.namePatterns = patterns;
          if (prefix) body.emailPrefix = prefix;
          
          const { data, error } = await supabase.functions.invoke('cleanup-test-data-unified', {
            body
          });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true, data };
        } catch (err) {
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err) 
          };
        }
      }, { patterns: namePatterns, prefix: emailPrefix });

      if (result.success) {
        console.log(`✅ Cleanup succeeded on attempt ${attempt}`);
        return { success: true };
      }
      
      lastError = result.error;
      console.error(`❌ Cleanup failed on attempt ${attempt}:`, result.error);
      
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`❌ Cleanup error on attempt ${attempt}:`, err);
    }
    
    // Wait before retry (except on last attempt)
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
      await page.waitForTimeout(retryDelay);
    }
  }
  
  console.error(`❌ Cleanup failed after ${maxRetries} attempts`);
  return { success: false, error: lastError };
}

/**
 * Setup cleanup guard that runs automatically after each test
 * Use this in test.afterEach() for reliable cleanup
 */
export async function setupCleanupGuard(page: Page, options?: CleanupGuardOptions) {
  const result = await executeCleanupWithRetry(page, options);
  
  if (!result.success) {
    console.error('⚠️  CRITICAL: Test data cleanup failed!');
    console.error('⚠️  Test data may appear in production!');
    console.error('⚠️  Error:', result.error);
  }
  
  return result;
}

/**
 * Verify that test data doesn't exist in production tables
 * This can be used as a safety check before tests start
 */
export async function verifyNoTestData(page: Page): Promise<boolean> {
  try {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      
      // Check critical tables for test data
      const tables = [
        { name: 'sponsor_besties', column: 'bestie_name' },
        { name: 'featured_besties', column: 'bestie_name' },
        { name: 'discussion_posts', column: 'title' }
      ];
      
      const foundTestData: string[] = [];
      
      for (const table of tables) {
        const { data } = await supabase
          .from(table.name)
          .select('*')
          .or(`${table.column}.ilike.%test%,${table.column}.ilike.%e2e%`);
        
        if (data && data.length > 0) {
          foundTestData.push(`${table.name}: ${data.length} records`);
        }
      }
      
      return { hasTestData: foundTestData.length > 0, foundIn: foundTestData };
    });
    
    if (result.hasTestData) {
      console.error('⚠️  WARNING: Test data found in production tables!');
      console.error('⚠️  Found in:', result.foundIn);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error verifying test data:', err);
    return false;
  }
}
