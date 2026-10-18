# Admin reply attachment verification — 2026-10-18

## Live sandbox sends

Only new fixtures addressed to `delivered@resend.dev` were used. No existing messages were edited or deleted.

| Screen | Resend accepted email ID | Reply ID | Saved attachment count |
| --- | --- | --- | --- |
| Contact Submissions, normal Admin → Messages → All Messages navigation | 01a15154-ffb4-77ce-a7e7-ac0cfa47740f | 0f81d917-9dfe-40ea-a27f-9a20ce631d7d | 2 |
| MessagesManager, original component mounted with real AuthProvider in browser verification | 01a15157-5306-78b5-81ad-8fd16fdd4893 | c2418263-0a6d-42d7-9ef2-d3807d822285 | 2 |

MessagesManager has no current rendered entry in Admin.tsx: only an import remains. Its controls and real send/history/download flow were exercised, but it is not claimed reachable through normal navigation. No navigation changes were made.

Each reply used a 2611-byte PDF and 1376-byte PNG. Both Attach files controls were visible. Both thread histories displayed both file links after sending. Browser downloads of each PDF matched the original bytes; admin storage download of the PNG returned 200 and matching bytes. Backend logs at 23:24:47Z and 23:27:19Z confirm both Resend email IDs, with request IDs 01a15154-f546-7196-b145-a78d54971ab4 and 01a15157-4afb-70c1-8571-9da02fd0c8b6 respectively.

## Validation and access

- In both screens a >10 MiB file displayed “Attachments must total 10 MB or less per reply.” No send occurred.
- In both screens an EXE displayed the allowed image/PDF/Word/Excel guidance. No send occurred.
- Harmless server EXE and >10 MiB probes returned 400 with clear errors before sending.
- Supporter object download returned 400; bucket listing returned 200 with zero objects. Anonymous download/list returned 400. Admin download returned 200.
- Live bucket is private, with 10485760-byte limit. It was provisioned through the native Storage API, not migration 0008. **0008 contains only the SELECT RLS policy**, not bucket creation. Native Storage API provisioning is required; bucket INSERT/UPDATE SQL in migrations is unsupported. On another environment create the private bucket through native storage provisioning before applying its policy; do not invent bucket SQL.
- Five existing attachment-validation tests passed.

## Provider evidence limit

The edge handler passes actual base64 PDF/PNG contents in Resend's attachments argument, not URLs; both sends were accepted. The database independently records two attachments per reply. However, `GET /emails/{id}/attachments` returned 401 `restricted_api_key` for **both IDs** because the configured key permits sending only. Consequently provider-side attachment count and delivery receipt remain unverified; saved count 2 must not be represented as an independently retrieved Resend count. A read-capable Resend key, submitted securely, is required to close this last check. No extra sandbox send is required once reading is available.

## Evidence

`/tmp/browser/reply-final/results.json`, `storage-provider.json`, `{Contact Submissions,MessagesManager}-{control,oversize,disallowed,history}.png`, and both matching downloaded PDFs. Screenshots show the control, validation message, sandbox recipient and two history links.