# Security fix 4 — investigation, pending fix 3

No receiver code or deployment changed. Fix 3 remains incomplete, and TEST_FUNCTIONS_SECRET, PRINTIFY_WEBHOOK_SECRET and SENTRY_WEBHOOK_SECRET were absent from the runtime secret listing on 2026-10-18.

## Live unsigned baseline, 2026-10-18 22:12 UTC

Explicit empty Authorization; no signing headers. No real event forged.

- Printify: `{"type":"audit:unknown-event","resource":{}}` → 200 `{"success":true}`. Request ID `01a15113-09b1-77f4-9aae-05bd0a1a4763`, execution `8a1b4ba6-dad7-4561-89a6-fd621e99b271`; logs at 22:12:45 confirm unknown event processed. Unknown event reaches no mutation branch.
- Sentry: malformed JSON `{` → 500 JSON parse error, matching function logs at 22:12:46–47. Parsing fails before error_logs insertion.
- GitHub tests: malformed JSON `{` → 500 JSON parse error, matching function logs at 22:12:47–48. Parsing fails before test_runs insertion.

These probes establish unsigned handler reachability, not a demonstrated unauthorized real-event mutation. Source establishes the reachable effects below. No order/user data mutations were performed by the probes.

## Source-established effects and callers

- `printify-webhook`: Printify shipment-created/sent events update matching order_items tracking and shipped status, then call send-order-shipped; delivered events update fulfillment status. No direct transfer call. Legitimate caller is Printify webhook subscriptions.
- `sentry-webhook`: any accepted JSON maps to an error_logs insertion. No direct order updates, email send or transfer. Legitimate caller is Sentry alert/integration webhooks; signed integration delivery must be confirmed, since legacy alert webhooks may differ.
- `github-test-webhook`: any accepted JSON maps to test_runs insertion. No direct order update, email send or transfer. Callers: `.github/workflows/{test,test-full,test-fast,email-tests}.yml`.

## Confirmed provider requirements

Official Printify docs: https://developers.printify.com/docs/ — optional webhook `secret`, `X-Pfy-Signature: sha256=<hex>`, HMAC-SHA256 over original request body bytes; constant-time comparison. Webhooks list/create: `/v1/shops/{shop_id}/webhooks.json`; modify: `/v1/shops/{shop_id}/webhooks/{webhook_id}.json`. Configure matching webhook subscription secret and PRINTIFY_WEBHOOK_SECRET without changing subscriptions' event topics or destinations. Verify supported secret-update behavior before provider changes.

Official Sentry docs: https://docs.sentry.io/integrations/integration-platform/webhooks/ — `Sentry-Hook-Signature`, HMAC-SHA256 using the integration Client Secret. Locate the integration's Client Secret in its Sentry integration configuration and securely save as SENTRY_WEBHOOK_SECRET; confirm this receiver is connected to that integration, not just an unsigned legacy alert action. Do not replace the SENTRY_DSN.

GitHub Actions: same TEST_FUNCTIONS_SECRET must exist in Cloud and repository Settings → Secrets and variables → Actions. Workflows must send it in a shared header; never embed it or expose it to frontend code.

## Rollout blocker

Implementation waits for completion of fix 3 as requested. When implementing, Printify/Sentry start log-only until provider configuration and signed delivery are proven; log only provider/outcome and missing-secret/header status, never bodies/signatures/secrets. GitHub enforcement follows configured workflow callers and shared secret. No unsigned→401 result is claimed yet. Existing reference docs incorrectly claim GitHub/Sentry signatures are already verified; source and live baseline above supersede those claims.