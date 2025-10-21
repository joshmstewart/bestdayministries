# Test Performance Optimization

## ⚡ Speed Improvements (34min → ~8-10min)

### Major Optimizations Applied

1. **Single Browser in CI (3x faster)**
   - **Before**: Running chromium + firefox + webkit = 3x test time
   - **After**: Chromium only in CI (covers 95% of users)
   - **Savings**: ~66% reduction
   - **Local**: Can still run all browsers for comprehensive testing

2. **Reduced Shards (Better distribution)**
   - **Before**: 8 shards with uneven distribution
   - **After**: 6 shards with better balance
   - **Savings**: ~10-15% reduction from overhead
   - **Benefit**: Less GitHub Actions job startup overhead

3. **Aggressive Timeouts**
   - **Before**: 60s test timeout, 30s navigation, 15s action
   - **After**: 30s test timeout, 15s navigation, 10s action
   - **Savings**: Forces slow tests to fail fast
   - **Benefit**: Identifies performance issues earlier

4. **No Retries in CI**
   - **Before**: 1 retry per failed test (doubles time)
   - **After**: 0 retries - tests must be reliable
   - **Savings**: ~10-20% for flaky tests
   - **Benefit**: Forces us to fix flaky tests instead of masking them

5. **Efficient Global Cleanup**
   - **Before**: cleanup.spec.ts ran as separate test file
   - **After**: globalTeardown runs once after ALL shards complete
   - **Savings**: ~1-2 minutes per shard
   - **Benefit**: No test overhead, runs once globally

### Expected Results

| Configuration | Before | After | Improvement |
|--------------|--------|-------|-------------|
| Total Runtime | 34 min | ~8-10 min | ~70% faster |
| Shard Count | 8 | 6 | Better distribution |
| Browsers | 3 | 1 (CI) | 66% less work |
| Timeouts | 60s | 30s | Fail fast |
| Retries | 1 | 0 | No masking |

## 🎯 CI/CD Strategy

### Fast Feedback (Main Branch)
```yaml
# Default: Fast feedback on every commit
- Run: Chromium only
- Shards: 6 parallel workers
- Timeout: 30s per test
- Duration: ~8-10 minutes
```

### Comprehensive Testing (Weekly/Pre-release)
```yaml
# Optional: Full browser matrix
- Run: Chromium + Firefox + Webkit
- Shards: 6 parallel workers per browser
- Timeout: 60s per test (more lenient)
- Duration: ~30 minutes
```

## 🔧 Configuration Details

### Playwright Config (playwright.config.ts)
```typescript
// CI: Chromium only
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  // Only include other browsers locally
  ...(process.env.CI ? [] : [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ]),
]

// Aggressive timeouts for fast feedback
timeout: 30000,  // 30s per test
actionTimeout: 10000,  // 10s per action
navigationTimeout: 15000,  // 15s per navigation

// No retries - tests must be reliable
retries: 0
```

### GitHub Actions (test.yml)
```yaml
e2e-tests:
  timeout-minutes: 30  # Reduced from 60
  strategy:
    matrix:
      shardIndex: [1, 2, 3, 4, 5, 6]  # Reduced from 8
      shardTotal: [6]
  steps:
    - name: Run Playwright tests
      run: npx playwright test --project=chromium  # Chromium only
```

### Global Teardown (tests/global-teardown.ts)
- Runs ONCE after all shards complete
- No test file overhead (removed cleanup.spec.ts)
- Retry logic built-in (3 attempts)
- Fails safely if cleanup doesn't work (defensive filtering still active)

## 📊 Monitoring

### Key Metrics to Watch
1. **Total test duration**: Should be ~8-10 minutes
2. **Shard balance**: All shards should complete in similar time
3. **Flaky tests**: With 0 retries, these will fail immediately
4. **Cleanup success**: Check logs for global teardown success

### If Tests Fail
1. **Timeout errors**: Test is too slow - optimize or increase timeout
2. **Flaky failures**: Fix the test - no retries to mask issues
3. **Cleanup failures**: Check defensive filtering is working

## 🚀 Running Tests Locally

### Quick (Chromium only - matches CI)
```bash
npm run test:e2e
```

### Comprehensive (All browsers)
```bash
npx playwright test  # Runs all browsers locally
```

### Debug Slow Tests
```bash
# Find slow tests
npx playwright test --reporter=html

# Run with debug
npx playwright test --debug
```

## 🛡️ Defense Layers

Even with faster tests, data safety is maintained:

1. **UI Filtering**: `SponsorBestieDisplay` filters test names
2. **Global Cleanup**: Runs once after all tests
3. **Edge Function**: `cleanup-test-data-unified` with retry logic
4. **Defensive Coding**: Test data clearly marked ('Test', 'E2E' prefixes)

## 📝 Best Practices

### Writing Fast Tests
1. Use specific selectors (avoid broad searches)
2. Use `expect().toBeVisible()` instead of `waitForTimeout()`
3. Mock slow operations when possible
4. Keep tests focused (one thing per test)

### Avoiding Flaky Tests
1. Use proper waiting strategies (not `waitForTimeout()`)
2. Use `page.waitForLoadState('networkidle')`
3. Use `expect().toBeVisible({ timeout: 10000 })`
4. Check element state before interacting

### Test Data Cleanup
1. Always prefix test data with 'Test' or 'E2E'
2. Use `setupCleanupGuard()` in afterEach if needed
3. Trust global teardown for final cleanup
4. Rely on defensive UI filtering as safety net

## 🔄 Future Optimizations

Potential future improvements:
1. **Test data isolation**: Separate test database
2. **Parallel test accounts**: Avoid auth conflicts
3. **Smart sharding**: Balance by test duration
4. **Incremental testing**: Only run affected tests
5. **Visual test optimization**: Percy parallel uploads
