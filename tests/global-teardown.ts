/**
 * Global teardown that runs after all tests complete
 * Cleans up test data from the database
 */

async function globalTeardown() {
  console.log('\n🧹 Running global test data cleanup...\n');
  
  try {
    // Import fetch for making HTTP requests
    const fetch = (await import('node-fetch')).default;
    
    // Get the base URL from environment or use default
    const baseURL = process.env.BASE_URL || 'http://localhost:8080';
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️  Supabase credentials not found, skipping cleanup');
      return;
    }

    // Call the cleanup edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/cleanup-test-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        removeTestProfiles: true,
        removeTestSponsorships: true,
        removeTestBesties: true,
        removeTestPosts: true,
        removeTestVendors: true,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test data cleanup completed successfully');
      console.log('Results:', result);
    } else {
      console.log('⚠️  Cleanup request failed:', response.status, response.statusText);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.log('⚠️  Error during cleanup:', error);
    // Don't fail the test run if cleanup fails
  }
  
  console.log('\n✨ Test run complete\n');
}

export default globalTeardown;
