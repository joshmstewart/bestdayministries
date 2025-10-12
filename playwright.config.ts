import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Increase timeout for CI environment
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Default test timeout - fast tests will use this
  timeout: 60000,

  // Grep patterns for running specific test types
  // Run only fast tests: npx playwright test --grep @fast
  // Run only slow tests: npx playwright test --grep @slow
  // Run all tests: npx playwright test
  grep: process.env.TEST_FILTER ? new RegExp(process.env.TEST_FILTER) : undefined,

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
