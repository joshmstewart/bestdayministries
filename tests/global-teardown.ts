import { invokeTestFunction } from './utils/test-functions';
/**
 * Global teardown that runs ONCE after ALL test shards complete
 * 
 * CRITICAL: This ensures test data cleanup happens even if tests fail
 * Defense-in-depth: UI components filter test data + this cleanup removes it from DB
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Running global cleanup after all test shards...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app to get Supabase client
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:8080');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Execute cleanup with exponential backoff retry logic
    let attempts = 0;
    const maxAttempts = 5; // INCREASED: More retries for reliability
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      attempts++;
      const backoff = Math.pow(2, attempts - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
      
      if (attempts > 1) {
        console.log(`  Waiting ${backoff}ms before retry ${attempts}/${maxAttempts}...`);
        await page.waitForTimeout(backoff);
      } else {
        console.log(`  Attempt ${attempts}/${maxAttempts}...`);
      }
      
      const { error } = await invokeTestFunction('cleanup-test-data-unified', {
        namePatterns: ['Test User', 'Test Bestie', 'Test Guardian', 'Test Supporter', 'Reply Test User',
          'Admin Test User', 'Thread Test User', 'Anonymous Test User', 'Authenticated Test User',
          'E2E', 'Email Test', 'Accept Test', 'Content Test', 'Visual Test'],
        emailPrefix: 'test-',
      });
      const result = { success: !error, error: error?.message };

      if (result.success) {
        console.log(`  ✅ Cleanup successful on attempt ${attempts}`);
        success = true;
      } else {
        console.error(`  ❌ Cleanup failed on attempt ${attempts}:`, result.error);
        // Exponential backoff already handled above
      }
    }
    
    if (!success) {
      console.error('⚠️  WARNING: Global cleanup failed after all retries!');
      console.error('⚠️  Test data may appear in production!');
    }
    
  } catch (error) {
    console.error('❌ Error in global teardown:', error);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('✨ Global teardown complete\n');
}

export default globalTeardown;
