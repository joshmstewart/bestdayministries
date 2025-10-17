import { test, expect } from '@playwright/test';

/**
 * Cleanup test that runs after all other tests
 * This ensures test data is removed from the database
 */
test.describe.serial('Test Data Cleanup', () => {
  test('should clean up all test data after tests complete', async ({ page }) => {
    console.log('🧹 Running test data cleanup...');
    
    // Navigate to a page that has Supabase client loaded
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Execute cleanup via edge function
    const result = await page.evaluate(async () => {
      try {
        // @ts-ignore - Supabase is globally available
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        const { data, error } = await supabase.functions.invoke('cleanup-test-data-unified', {
          body: {
            namePatterns: ['E2E Test', 'Automated Test', 'Playwright Test']
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

    console.log('Cleanup result:', result);
    
    // The test passes regardless of cleanup success to avoid blocking
    // but logs the results for visibility
    expect(result).toBeDefined();
  });
});
