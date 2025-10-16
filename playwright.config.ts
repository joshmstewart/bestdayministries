import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  // Global teardown to clean test data
  globalTeardown: './tests/global-teardown.ts',
  
  // Test configuration
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    extraHTTPHeaders: {},
  },

  // Default test timeout - fast tests will use this
  timeout: 60000,

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
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
