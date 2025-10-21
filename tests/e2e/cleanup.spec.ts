import { test, expect } from '@playwright/test';

/**
 * CRITICAL: Cleanup test that MUST run after all other tests
 * This prevents test data from appearing in production (especially sponsor carousel)
 * 
 * PRIORITY: Test data cleanup > test pass rate
 * It's better to have clean production data than passing tests with leaked test data
 */
test.describe.serial('Test Data Cleanup', () => {
  test('should clean up all test data after tests complete', async ({ page }) => {
    console.log('🧹 CRITICAL: Running comprehensive test data cleanup...');
    console.log('⚠️  This cleanup is MANDATORY to prevent test besties from showing in live carousel');
    
    // Navigate to a page that has Supabase client loaded
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Execute cleanup via edge function - retry up to 3 times to ensure it succeeds
    let result;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Cleanup attempt ${attempts}/${maxAttempts}...`);
      
      result = await page.evaluate(async () => {
        try {
          // @ts-ignore - Supabase is globally available
          const { supabase } = await import('/src/integrations/supabase/client.ts');
          
          const { data, error } = await supabase.functions.invoke('cleanup-test-data-unified', {
            body: {
              namePatterns: ['Test', 'E2E', 'test', 'e2e', 'Email Test']
            }
          });

          if (error) {
            console.error('Cleanup error:', error);
            return { success: false, error: error.message };
          }

          console.log('✅ Cleanup completed:', data);
          return { success: true, data };
        } catch (err) {
          console.error('Error during cleanup:', err);
          return { 
            success: false, 
            error: err instanceof Error ? err.message : String(err) 
          };
        }
      });

      if (result.success) {
        console.log(`✅ Cleanup succeeded on attempt ${attempts}`);
        break;
      } else {
        console.error(`❌ Cleanup failed on attempt ${attempts}:`, result.error);
        if (attempts < maxAttempts) {
          console.log('⏳ Waiting 2 seconds before retry...');
          await page.waitForTimeout(2000);
        }
      }
    }

    console.log('Final cleanup result:', result);
    
    // CRITICAL: This test MUST pass to ensure cleanup ran
    // If it fails, test data will leak into production
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
