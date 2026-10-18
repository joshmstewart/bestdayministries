import { invokeTestFunction } from './test-functions';
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
    const { error } = await invokeTestFunction('cleanup-test-data-unified', {
      namePatterns: ['Test', 'E2E'], ...options,
    });
    const response = { success: !error, error: error?.message };

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
 * Generate test naming convention
 */
export function generateTestName(baseName: string): string {
  return `Test ${baseName}`;
}

/**
 * Check if a name follows test naming convention
 */
export function isTestName(name: string): boolean {
  return name.startsWith('Test ') || 
         name.toLowerCase().includes('test') ||
         name.startsWith('E2E ');
}
