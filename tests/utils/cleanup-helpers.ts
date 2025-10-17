import { Page } from '@playwright/test';

/**
 * Cleanup helper for test data
 * Removes all test data created during E2E tests
 */

export interface CleanupOptions {
  removeTestProfiles?: boolean;
  removeTestSponsorships?: boolean;
  removeTestBesties?: boolean;
  removeTestPosts?: boolean;
  removeTestVendors?: boolean;
}

/**
 * Clean up all test data from the database
 */
export async function cleanupTestData(
  page: Page,
  options: CleanupOptions = {
    removeTestProfiles: true,
    removeTestSponsorships: true,
    removeTestBesties: true,
    removeTestPosts: true,
    removeTestVendors: true,
  }
) {
  console.log('🧹 Starting test data cleanup...');

  try {
    // Call the unified cleanup edge function
    const response = await page.evaluate(async (opts) => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        (window as any).VITE_SUPABASE_URL || '',
        (window as any).VITE_SUPABASE_ANON_KEY || ''
      );

      const { data, error } = await supabase.functions.invoke('cleanup-test-data-unified', {
        body: { namePatterns: ['E2E Test', 'Automated Test', 'Playwright Test'], ...opts }
      });

      if (error) {
        console.error('Cleanup error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    }, options);

    if (response.success) {
      console.log('✅ Test data cleanup completed successfully');
      return true;
    } else {
      console.error('❌ Test data cleanup failed:', response.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return false;
  }
}

/**
 * Mark data as test data by adding metadata
 */
export function markAsTestData(metadata: Record<string, any> = {}): Record<string, any> {
  return {
    ...metadata,
    is_test_data: true,
    test_created_at: new Date().toISOString(),
    test_session_id: `test-${Date.now()}`
  };
}

/**
 * Generate a test-friendly name with E2E Test prefix
 */
export function generateTestName(baseName: string): string {
  return `E2E Test ${baseName}`;
}

/**
 * Check if a name follows automated test naming conventions
 */
export function isTestName(name: string): boolean {
  const automatedPatterns = ['E2E Test', 'Automated Test', 'Playwright Test'];
  return automatedPatterns.some(pattern => name.includes(pattern));
}
