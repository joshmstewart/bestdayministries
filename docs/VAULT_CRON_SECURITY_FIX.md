# Vault cron credential rotation — blocked preflight

Checked 2026-10-20 UTC. Backend only; no publishing requested or performed.

## Live preflight
- Job 13: `send-daily-digest-emails`, active, schedule `0 14 * * *`, digest body `{"frequency":"daily"}`.
- Job 14: `send-weekly-digest-emails`, active, schedule `0 14 * * 1`, digest body `{"frequency":"weekly"}`.
- Job 5: `reconcile-donations-hourly`, active, schedule `0 * * * *`, body `{"mode":"live","limit":500}`.
- All three commands currently contain literal cron headers; values were redacted during inspection and are not recorded here.
- Neither `digest_cron_secret` nor `donation_reconcile_cron_secret` exists in Vault.
- At 02:51:54 UTC, pending live donations: 0; digest log rows: 4.
- Pre-change hourly run 685023 at 02:00:00 UTC reported `succeeded` in cron history. This only proves SQL HTTP enqueue success, not HTTP/function business success.
- Digest currently accepts its environment credential, service-role bearer, or verified admin/owner JWT. Reconciliation currently accepts its environment credential with a literal fallback, or verified admin/owner JWT.
- No table policies, financial records, subscriptions or provider settings need changing.

## Blocker
The database migration tool refused creation of a boolean-only Vault verifier with:
`Agent access to secrets is not allowed.`

The refused operation would create `public.verify_vault_cron_secret(text,text)`, SECURITY DEFINER with empty search_path, a two-name allowlist, fixed 32-byte SHA-256 digest comparison, fail-closed missing configuration, revocation from PUBLIC/anon/authenticated, and EXECUTE only for service_role. It would never return Vault plaintext.

No migration was applied. No credentials were generated. No live cron command or edge handler was changed or deployed. Temporary unused helper/test files were removed. Agent Vault access must be permitted before this requested implementation can proceed; do not work around the denial using a different database interface.

## Intended commands — NOT applied
The endpoint host is omitted here; each existing live URL must remain unchanged. Keep all schedules, job IDs, active flags and bodies unchanged.

Job 13:
```sql
SELECT net.http_post(
  url := '<unchanged existing endpoint>/send-digest-email',
  headers := jsonb_build_object('Content-Type', 'application/json',
    'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets
                      WHERE name = 'digest_cron_secret')),
  body := '{"frequency":"daily"}'::jsonb
) AS request_id;
```

Job 14:
```sql
SELECT net.http_post(
  url := '<unchanged existing endpoint>/send-digest-email',
  headers := jsonb_build_object('Content-Type', 'application/json',
    'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets
                      WHERE name = 'digest_cron_secret')),
  body := '{"frequency":"weekly"}'::jsonb
) AS request_id;
```

Job 5:
```sql
SELECT net.http_post(
  url := '<unchanged existing endpoint>/reconcile-donations-from-stripe',
  headers := jsonb_build_object('Content-Type', 'application/json',
    'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets
                      WHERE name = 'donation_reconcile_cron_secret')),
  body := '{"mode":"live","limit":500}'::jsonb
) AS request_id;
```

## Required verification after access is available
1. Generate each independent credential wholly within the database, never returning its value.
2. Apply the service-role-only boolean verifier and switch the two handlers to it; preserve existing admin/service authorization paths.
3. Atomically replace only the three cron header expressions; never output legacy command literals.
4. Submit the legacy digest header read locally from the historical migration without logging it, using an invalid frequency body as an additional email-safety barrier. Require 401 before processing and unchanged digest logs.
5. Check service-role-only RPC execution permissions, fail-closed errors, anonymous denial, and existing admin authorization with harmless invalid/zero-work requests only.
6. Observe the next naturally scheduled hourly run; correlate cron enqueue success with HTTP 200 and edge function completion. Do not manually run financial processing or infer business success from cron history alone.

Old-header 401 and a post-change hourly run are **not verified**, because the change was blocked. No email was sent, no Stripe endpoint was called, and no donation data was changed by this task.