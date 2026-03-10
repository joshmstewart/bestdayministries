

# Implement Health Check Cold-Start Fix

## Changes

### 1. `supabase/functions/health-check/index.ts`
- Reduce `BATCH_SIZE` from 20 to 5
- Increase default timeout from 5000ms to 10000ms
- Add single retry for timed-out functions (they'll be warm on second attempt)

### 2. `src/hooks/useHealthCheck.ts`
- Change timeout from 5000 to 10000 in the `invoke` call

No other files need changes.

