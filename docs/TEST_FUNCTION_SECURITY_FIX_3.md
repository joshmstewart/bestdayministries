# Security Fix 3 — production test-function lockdown

## Baseline and callers
Harmless OPTIONS succeeded on all fifteen endpoints. Malformed JSON, not real events, reached parsing (500) on set-test-admin-roles, test-contact-form-helper, cleanup-test-data-unified and cleanup-email-test-data. No setup, deletion, role grant or email was executed. Baseline request IDs and log messages are in `/tmp/browser/test-function-security/before.json` and `baseline-logs.json`.

| Function | Prior in-code auth | Capability | Known callers |
|---|---|---|---|
| setup-test-sponsorship | none | creates/updates test sponsorship fixtures | no runtime caller found |
| create-persistent-test-accounts | none | creates/upserts test users, profiles, roles | UserManagement, cancel/refund scripts |
| cleanup-test-data-unified | none | deletes matching test accounts/data | global teardown, cleanup helpers/guards, email workflow |
| test-contact-form-helper | none | reads/deletes fixtures, forwards inbound test email | resend-test-helper |
| reset-test-environment | admin check | deletes/seeds test fixtures | admin UI |
| set-test-admin-roles | none | grants admin roles by ID | no runtime caller found |
| seed-email-test-data | none | creates accounts/roles/content, returns test sessions | retry wrapper |
| seed-email-test-data-with-retry | none; service-role forwarding | invokes seed repeatedly | email workflow, archived email tests |
| cleanup-email-test-data | none | deletes test accounts/content/settings | no runtime caller found |
| run-smoke-test-internal | none; service-role forwarding | invokes marketplace smoke test | admin test workflow/manual wrapper |
| e2e-marketplace-smoke-test | admin or service-role | creates fixtures/checkout, sends email, cleans up | admin panel, smoke wrapper |
| send-digest-email-test | admin JWT | sends digest to an admin | ProfileSettings |
| cleanup-cancel-refund-test-orders | admin JWT | deletes test/caller-selected orders | cancel/refund scripts |
| send-test-newsletter | admin JWT | sends campaign test email | newsletter admin UI/tests |
| send-test-automated-template | admin JWT | sends automated-template test email | newsletter admin UI |

No cron caller was found for these endpoints. Recommend reviewing/deleting the three apparently unreferenced endpoints (setup-test-sponsorship, set-test-admin-roles, cleanup-email-test-data) after confirming external/manual use; **none deleted**. Bootstrap content utilities seed-jokes, seed-halloween-stickers, seed-valentine-stickers, seed-mood-responses and create-system-user are not counted as completed test-only lockdown: their classification and authorization need separate review.

## Implementation
Every listed handler uses `_shared/testFunctionsAuth.ts` before body parsing/business work. A nonempty `x-test-functions-secret` must match `TEST_FUNCTIONS_SECRET` using fixed-length SHA-256 digests and timing-safe comparison, or a verified user JWT must resolve to admin/owner in protected user_roles. All failures return 401 with shared CORS headers. Original admin JWT/shared header is forwarded by retry/smoke wrappers; service-role bypass removed. Shared-secret digest tests require an explicit existing admin recipient ID. No credentials are printed or stored in source.

Explicit verify_jwt=false settings: setup-test-sponsorship, cleanup-test-data-unified, test-contact-form-helper, set-test-admin-roles, seed-email-test-data, run-smoke-test-internal, send-test-newsletter. Other listed endpoints use the managed default; live requests reached the in-code guard. send-test-newsletter's former true setting was changed to false so shared-header authorization can work. SDK version pins lacking the CORS export initially caused startup 503; aligned imports to npm SDK @2 and redeployed, then all checks below passed.

CI job environment uses `${{ secrets.TEST_FUNCTIONS_SECRET }}`. Node-only test helpers send that header; browser page.evaluate cleanup calls were moved to Node to avoid exposing the credential to app JavaScript/storage/traces. Workflow webhook header forwarding prepares Fix 4 but github-test-webhook enforcement remains separate.

## Live evidence
- 2026-10-18 22:49 UTC: **15/15 anonymous 401, 15/15 plain supporter 401, 15/15 wrong-secret 401; 15/15 preflight 200**. Request IDs per endpoint: `/tmp/browser/test-function-security/after.json`.
- Representative set-test-admin-roles IDs: anonymous `01a15134-36c4-742e-a38d-3158bd4e9dcd`; supporter `01a15134-3b6a-77d9-94e3-2f430adfc83a`; bad header `01a15134-4965-7dab-bc01-9cbd2d86b39a`.
- Browser-origin six denied calls were readable 401 with no CORS failure: `browser.json`.
- Live logs show `test-functions authorization denied` at 22:48:59/22:49:03 UTC (`after-logs.json`).
- Eight focused authorization unit regressions pass. Latest app build log: build OK.
- No user/account/order changes, deletion, setup operation, role grant or email executed during verification.

## Remaining setup / verification
The shared secret has **not been configured**; secure-form attempt was interrupted. Josh must set the same securely generated value in Cloud secret `TEST_FUNCTIONS_SECRET` and GitHub repository Settings → Secrets and variables → Actions → `TEST_FUNCTIONS_SECRET`. Never use a VITE-prefixed variable. Admin JWT access remains available; shared-secret CI setup is blocked until configured. Live authorized admin/owner and matching-secret execution was deliberately not exercised because these endpoints can mutate data/send email; unit checks cover authorization acceptance only. Do not claim their full business workflows verified.