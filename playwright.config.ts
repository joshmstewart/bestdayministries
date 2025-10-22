import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // CRITICAL: Must stay false to prevent fixture conflicts
  forbidOnly: !!process.env.CI,
  retries: 0, // Tests should be reliable without retries
  workers: process.env.CI ? 1 : undefined, // CRITICAL: Force serial execution in CI to eliminate fixture cleanup errors
  reporter: 'html',
  
  // Global setup to polyfill import.meta for Node.js
  globalSetup: './tests/global-setup.ts',
  
  // Global teardown to clean test data
  globalTeardown: './tests/global-teardown.ts',
  
  // Test configuration
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 20000, // INCREASED: 20s for slower CI environment
    extraHTTPHeaders: {},
  },

  // Default test timeout - increased for stability
  timeout: 45000, // INCREASED: 45s to accommodate slower CI and auth flows

  // Grep patterns for running specific test types
  // Run only fast tests: npx playwright test --grep @fast
  // Run only slow tests: npx playwright test --grep @slow
  // Run all tests: npx playwright test
  // Run performance tests: npx playwright test --grep @slow
  grep: process.env.TEST_FILTER ? new RegExp(process.env.TEST_FILTER) : undefined,

  // Expect assertions
  expect: {
    timeout: 10000
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Ensure fixtures cleanup properly
        launchOptions: {
          args: ['--disable-dev-shm-usage']
        }
      },
    },
    // Only run Chromium in CI for speed - covers 95% of users
    // Firefox and Webkit can be run locally or in separate jobs if needed
    ...(process.env.CI ? [] : [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
    ]),
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
