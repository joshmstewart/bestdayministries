# Test Data Cleanup Issue - October 25, 2025

## Problem Statement

Test users, notifications, and contact form submissions persist in the database after test runs complete, appearing in production UI.

## Current Cleanup Architecture

### 1. Global Teardown (tests/global-teardown.ts)
- **Runs**: Once after ALL test shards complete
- **Method**: Calls `cleanup-test-data-unified` edge function
- **Retry Logic**: 5 attempts with exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Patterns**: Targets users/data with specific name patterns and email prefixes

### 2. Per-Test Cleanup (afterEach/afterAll hooks)
- **Coverage**: Most test files have afterEach or afterAll cleanup hooks
- **Method**: Calls same `cleanup-test-data-unified` function
- **Issue**: Not all tests have cleanup hooks

### 3. Edge Function (cleanup-test-data-unified)
- **Location**: `supabase/functions/cleanup-test-data-unified/index.ts`
- **Size**: 1031 lines - comprehensive cleanup logic
- **Strategy**: Two-phase approach:
  1. Clean data FROM persistent accounts (keep accounts, delete their data)
  2. Clean data FROM users being deleted + pattern-based cleanup

## Root Causes Identified

### 1. **Persistent Test Accounts**
Protected accounts that NEVER get deleted:
```typescript
const PERSISTENT_TEST_EMAILS = [
  'testbestie@example.com',
  'testguardian@example.com', 
  'testsupporter@example.com',
  'test@example.com',        // Main admin account
  'test1@example.com' through 'test6@example.com' // Shard accounts
];
```

**Issue**: These accounts have their DATA cleaned, but if cleanup fails or is incomplete, their test data remains visible.

### 2. **Pattern Matching Gaps**
Current patterns may not catch all test data variations:
- Email patterns: `emailtest-`, `test-`, `@test.com`
- Name patterns: `Test User`, `E2E`, `Email Test`, `Accept Test`, etc.

**Issue**: If test data uses unexpected naming, it won't be matched and cleaned.

### 3. **Cleanup Timing**
- Global teardown runs ONCE at the very end
- Individual afterEach/afterAll hooks run during test execution
- If a test fails before cleanup hook executes, data persists

### 4. **Notifications to Admins**
Test users create content (posts, contact forms) that trigger notifications sent to REAL admin users.

**Example Flow**:
1. Test user "Test User" submits contact form
2. System creates notification for admin@example.com (real admin)
3. Test user gets deleted, but notification to admin persists
4. Admin sees "New message from Test User" in production

**Current Fix**: Cleanup function now deletes:
- Notifications owned by test users (user_id match)
- Notifications ABOUT test content (searches metadata and message text)

### 5. **Contact Form Submissions**
Contact form submissions table has NO user_id column, only email/name fields.

**Issue**: Must rely entirely on pattern matching of email/name strings.

## Recent Improvements (Not Yet Deployed)

### Enhanced Logging
Added comprehensive logging to cleanup function:
```typescript
// Start logging
console.log('🧹 ============================================');
console.log('🧹 UNIFIED TEST DATA CLEANUP - START');
console.log(`🧹 Timestamp: ${new Date().toISOString()}`);
console.log('🧹 Cleanup options:', JSON.stringify(options, null, 2));

// End logging  
console.log('✅ ============================================');
console.log('✅ UNIFIED TEST DATA CLEANUP - COMPLETE');
console.log(`✅ Deleted users: ${testUsers.length}`);
console.log(`✅ Persistent accounts cleaned: ${persistentAccountIds.length}`);
console.log(`✅ Timestamp: ${new Date().toISOString()}`);

// Error logging
console.error('❌ ============================================');
console.error('❌ ERROR IN TEST DATA CLEANUP');
console.error('❌ Error:', error);
console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
```

**Benefit**: Can now see in edge function logs:
- When cleanup runs
- What options were passed
- How many users were deleted
- How many persistent accounts were cleaned
- Any errors with full stack traces

## Recommended Solutions

### Immediate (Deploy Now)
1. ✅ **Enhanced logging** (just implemented)
2. **Manual cleanup trigger** - Add admin UI button to manually trigger cleanup
3. **Verify cleanup is running** - Check edge function logs after next test run

### Short-term (Next Week)
1. **Add more patterns** - Expand pattern matching to catch edge cases
2. **Pre-test cleanup** - Run cleanup BEFORE tests start (in addition to after)
3. **Test-specific prefixes** - Use unique prefixes per test run for easier cleanup

### Long-term (Future)
1. **Separate test database** - Use dedicated test database instance
2. **Auto-expiring test data** - Add timestamps and auto-cleanup for old test data
3. **Test data tagging** - Add `is_test_data` boolean column to all tables

## Verification Steps

### After Deploying Enhanced Logging

1. **Trigger test run** (push code or manual trigger)
2. **Check edge function logs**:
   ```
   Admin → Backend → Edge Functions → cleanup-test-data-unified
   ```
3. **Look for**:
   - START/COMPLETE log blocks
   - Number of users deleted
   - Number of persistent accounts cleaned
   - Any error blocks

### Expected Success Pattern
```
🧹 ============================================
🧹 UNIFIED TEST DATA CLEANUP - START
🧹 Timestamp: 2025-10-25T...
🧹 Cleanup options: {...}
...
✅ Deleted users: 15
✅ Persistent accounts cleaned: 7
✅ UNIFIED TEST DATA CLEANUP - COMPLETE
```

### Expected Failure Pattern
```
❌ ============================================
❌ ERROR IN TEST DATA CLEANUP
❌ Error: [specific error]
❌ Stack: [stack trace]
```

## Manual Cleanup Procedure

If test data persists, manually trigger cleanup:

### Option 1: Via Admin UI (Recommended)
1. Navigate to Admin → Testing tab
2. Click "Clean Test Data" button
3. Confirm cleanup
4. Check results in toast notification

### Option 2: Via Edge Function Direct Call
```typescript
const { data, error } = await supabase.functions.invoke('cleanup-test-data-unified', {
  body: {
    namePatterns: ['Test', 'E2E', 'Email Test', 'Accept Test'],
    emailPrefix: 'test-'
  }
});
```

### Option 3: Via Database Query (Last Resort)
```sql
-- DO NOT RUN THIS WITHOUT BACKUP
-- This is destructive and should only be used in emergencies

-- Delete test users (not recommended - use edge function instead)
DELETE FROM auth.users 
WHERE email LIKE '%test%@%' 
  AND email NOT IN (
    'test@example.com',
    'testbestie@example.com',
    'testguardian@example.com',
    'testsupporter@example.com'
  );
```

## Monitoring & Alerts

### What to Monitor
1. **Test data count** - Should decrease after cleanup
2. **Cleanup execution** - Should see logs after each test run
3. **Cleanup duration** - Should complete within 30 seconds
4. **Cleanup errors** - Should be zero in production

### Create Alerts For
1. Cleanup function not running for > 24 hours
2. Cleanup taking > 60 seconds
3. Test data count increasing over time
4. Cleanup errors appearing in logs

## Related Documentation

- `docs/TEST_DATA_CLEANUP.md` - Original cleanup documentation
- `docs/TEST_DATA_CLEANUP_CRITICAL.md` - Critical cleanup patterns
- `docs/TESTING_BEST_PRACTICES.md` - Test writing guidelines
- `tests/global-teardown.ts` - Global cleanup implementation
- `supabase/functions/cleanup-test-data-unified/index.ts` - Cleanup logic

## Status

**Current Status**: Enhanced logging implemented, not yet deployed
**Next Step**: Deploy and verify logs show cleanup running
**Owner**: Development team
**Priority**: High - affects production user experience
