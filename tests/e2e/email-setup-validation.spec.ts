import { test, expect } from '@playwright/test';
import { 
  isMailtrapConfigured, 
  validateMailtrapSetup,
  debugMailtrapConfig,
  testMailtrapConnectivity
} from '../utils/mailtrap-helper';

test.describe('Mailtrap Setup Validation', () => {
  test('validate mailtrap setup and connectivity @email', async () => {
    // Skip if not configured
    if (!isMailtrapConfigured()) {
      test.skip();
    }

    // This will output detailed debug information and test both auth methods
    await validateMailtrapSetup();
    
    // If we get here, setup is valid
    expect(true).toBe(true);
  });

  test('debug mailtrap configuration @email', async () => {
    // This test always runs to show what's configured
    debugMailtrapConfig();
    
    const configured = isMailtrapConfigured();
    console.log(`\nConfiguration status: ${configured ? '✅ Ready' : '❌ Not configured'}\n`);
    
    expect(true).toBe(true);
  });

  test('test both authentication methods @email', async () => {
    if (!isMailtrapConfigured()) {
      console.log('⚠️ Skipping: Mailtrap not configured');
      test.skip();
    }

    const result = await testMailtrapConnectivity();
    
    console.log('\nConnectivity Test Result:');
    console.log(`Success: ${result.success}`);
    console.log(`Method: ${result.method || 'N/A'}`);
    console.log(`Error: ${result.error || 'N/A'}\n`);
    
    expect(result.success).toBe(true);
    expect(result.method).toBeTruthy();
  });
});
