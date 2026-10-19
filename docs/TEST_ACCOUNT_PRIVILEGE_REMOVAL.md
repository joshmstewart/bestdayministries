# Test-account privilege removal — 2026-10-19 UTC

## Approved scope and inventory
Josh approved demotion of privileged test accounts only, with no other user-data changes. All eight accounts below had exactly one role row. No passwords are included in this report.

| Email | Previous role | Repository credential evidence |
|---|---|---|
| emailtest-admin-1784226923@example.com | admin | No exact-account credential found |
| emailtest-moderator-1784226811@example.com | moderator | No exact-account credential found |
| emailtest-owner-1784227068@example.com | owner | No exact-account credential found |
| emailtest-security-b3c4dabf-created-admin@example.com | admin | No exact-account credential found |
| emailtest-security-b3c4dabf-created-owner@example.com | owner | No exact-account credential found |
| emailtest-security-b3c4dabf-created-vendor@example.com | vendor | No exact-account credential found |
| testadmin@example.com | admin | Static password in UserManagement and provisioners; authenticated successfully before demotion |
| testvendor@example.com | vendor | Unknown; no exact-account credential found |

Separately listed before mutation: `system@bestdayministries.app`, owner, one role row. Its provisioner generates a random password, not a published fixed password. It was not changed.

## Change
One scoped data update replaced each of the eight existing privileged role rows with supporter. No role rows or accounts were deleted or inserted. Readback confirms exactly one supporter row per listed account. No schema, policies, auth settings, subscriptions, vendor records, messages or financial records changed.

The fingerprint of all 278 role rows belonging to non-@example.com accounts was identical before and after: `e09e726d5dc03a3ef06d1c5759c0c873`. This includes Josh, Marla, other real accounts, and the system provisioner.

UserManagement's entire test-account card was removed, including embedded passwords, credential copy/login actions, and its create/verify shortcut. Normal user creation, password-reset, role editing, and unrelated copy controls remain unchanged. No test fixture or provisioner was changed.

## Live verification
- Repository test-admin password authenticated successfully before mutation. The issued session was kept only in a restricted temporary file, never printed or committed.
- Before demotion, GET `test_runs?select=id&limit=1` returned HTTP 200 with one row.
- After demotion, the **same already-issued session** GET `test_runs?select=id` returned HTTP 200 with zero rows. RLS filters unauthorized reads; a 403 is not required.
- `has_admin_access` RPC returned HTTP 200, `false`.
- User's role REST read returned exactly `[{'role': 'supporter'}]`.
- Non-sent newsletter campaigns returned zero rows; private profiles returned only the caller's own ID.
- Four live read-only tests passed in `tests/security/test_account_demotion_test.py`; rerun with `TEST_DEMOTION_SESSION_FILE` pointing to a locally secured testadmin session.
- The preview-served UserManagement module returned HTTP 200 and contained neither testadmin email nor the removed login/provisioning handlers. Observed build log: build OK at 2026-10-19T01:30:43Z.
- Temporary count-only evidence: `/tmp/browser/test-role-remediation/before.json` and `after.json`.

## Boundaries
The production role revocation takes effect immediately, including the tested existing session. The frontend credential removal still requires publishing; this task did not publish.

Known passwords remain in repository history and test-only fixtures. Provisioners/manual test role helpers remain unchanged and can grant privileged roles again if authorized and run. That is a separate security change, not silently implemented here. Demoting `user_roles.vendor` does not suspend a vendor-status record; those records were outside scope.

Public moderation settings and sent newsletter archives are intentionally readable under their existing policies and are not evidence of admin access. No comprehensive all-table or UI-route verification is claimed.