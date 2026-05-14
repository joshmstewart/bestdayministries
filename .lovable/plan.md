## Goal
Reduce Cloud cron usage on the marketplace vendor-payout retry job by stretching it from hourly to every 6 hours, since:
- The `retry-vendor-transfers` function is fully idempotent (skips items already paid).
- Stripe is the source of truth and admins have manual "Reconcile Now" buttons in the dashboard.
- Most vendor transfers succeed on the first synchronous attempt during checkout completion — the cron only catches the rare transient Stripe failure.

## Scope
Single change to one pg_cron schedule. No edge function code changes, no UI changes.

## Change

| Job | Current | New |
|---|---|---|
| `retry-vendor-transfers-hourly` (jobid 19) | `0 * * * *` (24×/day) | `0 */6 * * *` (4×/day) |

Rename to `retry-vendor-transfers-6hourly` for accuracy.

Net effect: **24 → 4 invocations/day = 83% reduction** on this job.

## Out of scope (leaving alone)
- `reconcile-marketplace-orders-job` (every 15m) — stays; this catches abandoned/pending Stripe checkouts where time-to-recovery matters for customer experience.
- `reconcile-donations-hourly`, `sync-donation-history-hourly`, `reconcile-bike-pledges-hourly` — donation flows; not part of this request.
- All `* * * * *` queue processors (newsletter, event emails) — these are queue-drainers where latency = user-visible delay.

## Worst-case impact analysis
A vendor transfer that fails on the synchronous path during checkout could now wait up to 6 hours to be retried (vs up to 1 hour). Because:
- Vendor receives the order email immediately regardless,
- Customer is unaffected (already paid),
- Admin can manually trigger from the Vendor management UI,

…this is acceptable. If a vendor reports a delayed payout, the manual button covers it.

## Implementation
One SQL migration:

```sql
SELECT cron.unschedule('retry-vendor-transfers-hourly');
SELECT cron.schedule(
  'retry-vendor-transfers-6hourly',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/retry-vendor-transfers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Verification
After applying: `SELECT jobname, schedule FROM cron.job WHERE jobname LIKE '%vendor-transfer%';` should show the new 6-hour schedule.

## Question before implementing
Want me to also stretch any of these other hourlies while we're in here?
- `sync-donation-history-hourly` → 6h? (purely cache-warming for the donation history page)
- `sync-newsletter-analytics-hourly` → 6h? (analytics dashboard freshness)

Or strictly just the vendor-transfers one?