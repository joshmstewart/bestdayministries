

# Cloud Cost Optimization Plan

## Summary of Changes

Three changes across two files:

### 1. Reduce health check cron to daily (`config.toml`)
Change `run-health-check` schedule from `0 */4 * * *` (6×/day) to `0 8 * * *` (once daily at 8 AM UTC / 1 AM MST). Saves ~5 invocations/day × 30 = ~150 invocations/month, plus each invocation pings 107 functions.

### 2. Fix `run-health-check` batching bug (root cause of 47 false-dead)
The scheduled `run-health-check/index.ts` still uses:
- Batch size of **20** (too many concurrent)
- Timeout of **5 seconds** (too short for cold starts)
- **No retry** for timeouts

Apply the same fixes already made to the client-side `health-check` function:
- Reduce batch size to **15**
- Increase timeout to **10 seconds**
- Add single retry for timeout failures

### 3. Bump donation auto-cancel from 2h to 5h (`reconcile-donations-from-stripe`)
Already discussed — ensures the 4-hour cron interval doesn't cause premature cancellations.

### 4. Change `sync-donation-history` to every 4 hours (`config.toml`)
From `0 * * * *` to `0 */4 * * *`.

## Files Changed

| File | Change |
|------|--------|
| `supabase/config.toml` | `run-health-check` → `0 8 * * *`, `sync-donation-history` → `0 */4 * * *` |
| `supabase/functions/run-health-check/index.ts` | Batch 20→15, timeout 5s→10s, add retry on timeout |
| `supabase/functions/reconcile-donations-from-stripe/index.ts` | Auto-cancel 2h→5h |

