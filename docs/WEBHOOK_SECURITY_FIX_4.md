# Security fix 4 — implemented; Printify ENFORCING, Sentry log-only

2026-10-18 23:46 UTC update (Josh-approved): `printify-webhook` now ENFORCES `X-Pfy-Signature` (HMAC-SHA256 over raw body, constant-time compare) and returns 401 before any parsing or work on missing/invalid signatures. With `PRINTIFY_WEBHOOK_SECRET` absent it fails closed: every request is rejected and logs `provider=printify outcome=missing-config`. Safe to enforce because the Joy House shop (id 9815220) has zero webhook subscriptions — verified via `GET /v1/shops/9815220/webhooks.json` returning `[]`. Printify's API cannot set a secret on an existing subscription (update accepts only `url`; the secret is Printify-generated at creation), so no in-place update was possible or needed. Probes: unsigned POST → 401, bad-signature POST → 401, OPTIONS → 200; log at 23:46:15Z confirms missing-config. Deployed source SHA-256 `5656bc34d05d79978f2122d4e9d3959e678eac16b3a0504d97345c7c0751c49c`. No subscriptions created/modified/deleted; no order/user data changes. Sentry remains log-only.

2026-10-18 23:18 UTC: three receivers deployed. GitHub enforces the existing TEST_FUNCTIONS_SECRET header before parsing or client creation, with no JWT bypass. Printify/Sentry verify raw-body HMAC in LOG-ONLY mode; they do not reject delivery based on verification. TEST_FUNCTIONS_SECRET is configured; PRINTIFY_WEBHOOK_SECRET and SENTRY_WEBHOOK_SECRET remain absent. No provider settings/subscriptions or order/user data changed.

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

## Deployed evidence, 2026-10-18 23:18 UTC

- GitHub unsigned: prior malformed JSON reached parsing (500); now 401, request `01a1514f-7dff-7b49-b26e-8cd1726bbade`.
- GitHub wrong secret: 401, request `01a1514f-824e-7da1-9dc1-ddf944b850e6`.
- GitHub supporter without shared header: 401, request `01a1514f-8f82-7e8a-a38a-3bd2dc97496a`.
- GitHub correct runtime secret: malformed JSON intentionally reaches existing parser error (500), request `01a1514f-863e-718e-be87-915cffe4d5c6`. Authorization accepted; no test_runs insertion, setup, deletion, role grant or email. This is NOT a successful valid-event persistence check.
- Sentry unsigned malformed JSON: existing parser error 500 preserved, request `01a1514f-8721-763b-8866-0c3f4a6bb501`; log 23:18:49Z: `[webhook-verification] provider=sentry mode=log-only outcome=missing-config`. Parsing fails before error_logs INSERT.
- Printify unknown event: 200 success preserved, request `01a1514f-8b0f-7be9-8825-b682780f3545`; log 23:18:50Z: `[webhook-verification] provider=printify mode=log-only outcome=missing-config`. Unknown event reaches no mutation/email branch.
- All three OPTIONS requests: 200. `/tmp/browser/webhook-fix4/after.json` records request IDs. No UI changes; browser screenshots would not prove these server-only checks.
- 19 new signing/header regressions plus 8 existing authorization regressions pass (`bunx vitest run tests/unit/webhook-verification.test.ts tests/unit/test-functions-authorization.test.ts`). Pass/fail signature cases tested with local fixtures; live signed-provider delivery remains unverified because configuration is absent.
- Deployment source SHA-256: GitHub `1a73bc97d9091e419cc773324fd80f760cdad6da80a97f362f15312372e09849`; Printify `0f1d903cdad859817fd8a77de2358a6b8dd21e024d4abfbde12700aaf1fee8f0`; Sentry `89136dce12180576712b8b0c83a9ab9b6f160f6f725ca7baeaae93487fc0dc68`.
- Four workflows already sent the header; each reporting step now checks secret presence and uses `curl --fail-with-body`, making unauthorized reporting fail visibly. Actual Actions execution is not observed.
- Existing logs also reveal a direct GitHub repository push webhook at 23:13:57Z, before enforcement. That caller is not an Actions workflow and cannot supply the required custom header through standard GitHub webhook settings; it will now be denied intentionally. No repository/provider webhook configuration changed. Actions are the supported reporting path.

## Josh's checklist before future enforcement

### Printify
1. Authorize a read-only inventory of the existing shop webhook subscriptions and identify every destination handled by this receiver. Do not change topics or URLs.
2. Secure form: request **PRINTIFY_WEBHOOK_SECRET**, with Generate + Copy and destination naming the Printify webhook signing-secret configuration. Josh copies the value to the provider (or authorizes API configuration); it must match Cloud exactly.
3. With Josh's explicit go-ahead, use the existing PRINTIFY_API_KEY to list subscriptions, then attempt the documented webhook PUT endpoint with the same URL and matching secret. Official docs expose `secret` on the webhook resource but show only URL in the PUT example: confirm acceptance and actual signed delivery rather than assuming PUT supports secret updates. If unsupported, stop and ask for a separately approved migration; never silently delete/recreate subscriptions.
4. Keep log-only while confirming every relevant real provider delivery records `pass`. Only after that, authorize a separate code change to enforce 401 for missing/invalid signatures. Saving the secret alone does not switch mode.

### Sentry
1. Open **Settings → Developer Settings**, identify the integration delivering to this receiver, and copy its **Client Secret**. Do not change SENTRY_DSN.
2. Secure form: request **SENTRY_WEBHOOK_SECRET** for that existing integration Client Secret (no generated substitute).
3. Confirm the webhook URL/resources/alert action belong to this integration. If this is an unsigned legacy alert webhook, approve a separate signed-integration setup; do not enforce against unsigned legacy delivery.
4. Keep log-only until signed Sentry delivery records `pass`; then authorize the separate code change enforcing 401 for missing/invalid signatures. No Sentry changes were performed this turn.

Verification emits fixed provider/mode/outcome labels (`pass`, `fail`, `missing-config`) only, never bodies/signatures/secrets. Raw payload and event-field console logging was removed from receivers; existing business behavior is otherwise preserved. No provider-mode environment switch was added, preventing accidental enforcement through secret setup.
