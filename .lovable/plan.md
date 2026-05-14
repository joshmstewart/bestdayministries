## Problem

When a customer pays for a marketplace order, `verify-marketplace-payment` fires off a vendor notification email per vendor in a try/catch that swallows failures. If that fetch fails (transient network blip, edge cold-start timeout, vendor function error), the vendor never finds out an order came in. There is no retry, no sweep, no alert. Marla's Stitch order in April was a silent victim of exactly this.

## Goal

Build a self-healing system so the agent never has to manually trigger a vendor email again, and prove the fix works against a reproducible stuck-order scenario.

## Plan

### 1. Detection — what counts as "missed"

A paid order_item is "missed" when ALL of these are true:
- Parent order `status = 'paid'` (or `'processing'`/`'completed'`) AND `paid_at IS NOT NULL`
- `vendor_id IS NOT NULL`
- No row in `email_notifications_log` where `notification_type IN ('vendor_new_order','house_vendor_new_order')` AND `metadata->>'order_id' = order.id` AND `metadata->>'vendor_id' = vendor_id`
- Order is at least 5 minutes old (give the live path a chance) and at most 30 days old (don't spam ancient backlog)

This relies on `send-vendor-order-notification` already inserting the audit row on success — confirmed at lines 317–332.

### 2. New edge function: `retry-vendor-order-notifications`

Modeled on `retry-vendor-transfers`. Each run:
1. Query distinct (order_id, vendor_id) pairs from `order_items` joined to `orders` matching the "missed" rule above.
2. For each pair, POST to `send-vendor-order-notification` with service-role auth (same call shape verify-marketplace-payment uses).
3. Collect per-pair results, return JSON summary `{ processed, succeeded, failed, details[] }`.
4. Log every attempt with `logStep`.
5. If a send fails, do NOT mark anything — next cron pass retries it. After N (e.g. 5) consecutive failures for the same pair, insert a row into `email_notifications_log` with `status='failed'` and notification_type `vendor_new_order_dlq` so admins can see it in Email Log UI and we don't loop forever.

### 3. Schedule via pg_cron

Hourly job (matches `retry-vendor-transfers` cadence) calling the new function with the service role key from vault. Use `supabase--insert` (not migration) per project rule for cron with embedded keys.

### 4. Harden the live path (defense in depth)

In `verify-marketplace-payment`, when the per-vendor `fetch` fails or returns non-2xx, do one inline immediate retry (1s backoff). Still don't fail the verification — the cron is the real safety net. This just shrinks the window where a customer sees "processing" with no vendor action.

### 5. Reproducible stuck-order fixture

Since I already broke the natural test case by manually triggering Stitch's email, create a fake duplicate that is identical to Marla's stuck state:
- Insert a new `orders` row: `customer_email = 'qa-stuckorder@bestdayministries.org'`, `status='processing'`, `paid_at = now() - interval '10 minutes'`, `stripe_mode='test'`, `total_amount` matching one Stitch product, `shipping_address` filled with a dummy address.
- Insert one `order_items` row pointing at a real Stitch product, `vendor_id = d4e6ec79-1f60-49a4-b3a7-755af4812b61`, `fulfillment_status='pending'`.
- Do NOT insert any matching row in `email_notifications_log` — this is the "missed notification" state.
- Tag the order with `notes = 'QA: stuck-vendor-notification fixture — safe to delete after retry sweep verified'` so it's obvious and cleanable.

### 6. Verification protocol

1. Confirm the fixture order shows up in a dry-run query of the detection SQL.
2. Manually invoke `retry-vendor-order-notifications` once.
3. Verify Stephie receives the email AND `email_notifications_log` gets the new row for that fixture's `(order_id, vendor_id)`.
4. Re-run the detection query — fixture should no longer match.
5. Run the function a second time — should report `processed: 0` for that pair (idempotency check).
6. Delete the fixture order (cascade deletes order_items).
7. Confirm cron job is registered in `cron.job`.

### 7. Docs

Update `docs/MASTER_SYSTEM_DOCS.md` MARKETPLACE_CHECKOUT_SYSTEM section + `docs/EDGE_FUNCTIONS_REFERENCE.md` with the new function, cron schedule, detection rule, and DLQ behavior.

## Technical details

**Files added:**
- `supabase/functions/retry-vendor-order-notifications/index.ts`

**Files changed:**
- `supabase/functions/verify-marketplace-payment/index.ts` — single inline retry per vendor send
- `docs/MASTER_SYSTEM_DOCS.md`, `docs/EDGE_FUNCTIONS_REFERENCE.md`

**Database changes (via supabase--insert):**
- pg_cron schedule for hourly invocation
- Fixture INSERT for stuck order + order_item (test mode, clearly tagged)

**No schema migrations needed** — detection works off existing `email_notifications_log` audit rows.

**DLQ approach:** Track attempt count via counting existing log rows for that (order_id, vendor_id) with status='failed'. After 5, stop retrying and surface in admin Email Log.
