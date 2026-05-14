# Exhaustive Marketplace Order End-to-End Test

Build a single edge function `e2e-marketplace-smoke-test` that places a real test-mode order against a real vendor product and asserts every downstream stage fired correctly. Run it on demand from an admin button and emit a pass/fail report per stage.

## What gets tested (every stage, no skips)

```text
STAGE                           ASSERTION
─────────────────────────────── ──────────────────────────────────────────────
1. Cart → checkout session      create-marketplace-checkout returns Stripe URL
2. Stripe payment               Confirm test PaymentIntent via Stripe API
3. verify-marketplace-payment   Order row exists, status='processing', paid_at set
4. Cart cleared                 shopping_cart rows for test user = 0
5. Customer receipt email       email_notifications_log has customer_order_confirm
6. Vendor notification email    email_notifications_log has vendor_new_order
7. Inline retry path            If first vendor send failed, retry succeeded
8. Cron sweep idempotency       retry-vendor-order-notifications skips it
9. Vendor transfer              create-vendor-transfer attempted, transfer_id set
10. Transfer retry cron         retry-vendor-transfers skips successful
11. Inventory decrement         products.inventory dropped by qty (if tracked)
12. Printify auto-submit        If POD: order_items.printify_order_id set
13. ShipStation sync            If physical+coffee: ShipStation order created
14. Fulfillment record          order_items.fulfillment_status='pending'
15. Notifications (in-app)      vendor + customer notifications rows exist
16. Reconciliation cron         reconcile-marketplace-orders leaves it alone
17. Audit/email log integrity   No DLQ rows, no orphaned states
```

Each stage returns `{stage, status: 'pass'|'fail'|'skip', detail, ms}`.

## How it runs

1. **Trigger**: New admin button in `Admin → Testing → "Run Marketplace Smoke Test"`. Calls the edge function with `{vendorId?, productId?}` (defaults: pick first approved Stripe-Connect-enabled vendor with an in-stock product).
2. **Setup**: Creates a synthetic test user (`smoketest+{ts}@bestdayministries.org`), inserts cart row, calls `create-marketplace-checkout` in **test mode**.
3. **Payment**: Uses Stripe test API to confirm the PaymentIntent with `pm_card_visa` (no browser needed).
4. **Verification**: Calls `verify-marketplace-payment`, then polls each downstream system (DB rows, log tables, Stripe transfers, Printify API, ShipStation API) with bounded waits.
5. **Cron checks**: Manually invokes both retry crons and the reconciliation cron to confirm they correctly skip a healthy order.
6. **Cleanup**: Deletes the test user, cart, order, order_items, logs, notifications. Cancels Stripe transfer if possible (test mode). Marks Printify/ShipStation test orders for cancellation where the API allows.
7. **Report**: Returns full stage table + writes to a new `e2e_test_runs` table for history. Admin UI renders the table with green/red per stage and copy-paste error details.

## Deliverables

- `supabase/functions/e2e-marketplace-smoke-test/index.ts` — orchestrator, all stage assertions inline.
- Migration: `e2e_test_runs(id, started_at, finished_at, overall_status, stages jsonb, vendor_id, product_id, order_id, error)`.
- `src/components/admin/MarketplaceSmokeTestRunner.tsx` — button + results table + history list, mounted in `TestRunsManager` or new sub-tab.
- Doc updates: `docs/MASTER_SYSTEM_DOCS.md` + `docs/EDGE_FUNCTIONS_REFERENCE.md` entries for the new function and table.

## Technical notes

- Runs in **test mode only** (hard-coded `stripe_mode='test'`) so it never touches live money or live vendor inboxes. Vendor email goes to a real inbox in test mode — we'll route it to a `smoketest@bestdayministries.org` alias by overriding the vendor's notification email for the synthetic order via metadata, OR we log the intended recipient and skip actual send for stage 6 (configurable flag `dryRunEmails`).
- Polls (not webhooks). Each stage has a max wait (default 30s) before failing.
- Honest failure: a stage that can't be checked (e.g., no Printify product picked) returns `skip` with reason, never `pass`.
- Idempotent: re-running creates a fresh test user and order each time.

## Open question before I build

**Email handling during the test** — two options:
- **A. Real send to a smoketest alias** (proves Resend + template + log all work end-to-end; one extra inbox to ignore).
- **B. Dry-run** (intercept the send call, verify the log row + intended payload, no real email goes out).

I'd recommend **A** for the first run (proves the whole pipe), then default to **B** for repeated runs. Confirm and I'll build it.
