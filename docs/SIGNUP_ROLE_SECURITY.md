# Signup role security fix — 2026-10-18

## Changes
Migration `drizzle/migrations/0006_allowlist_signup_roles.sql` replaces only the role expression in handle_new_user. Exact bestie/caregiver/supporter metadata is retained; anything else becomes supporter. SECURITY DEFINER, search_path, profile/name/avatar/friend-code logic remain identical. No RLS, grants, enum or existing-account changes.

`create-user` retains its existing authenticated admin/owner authorization. After creating a privileged account it updates that account's supporter row to admin/owner/vendor and sets created_by. One scoped UPDATE eliminates the supporter assignment atomically. It requires exactly one returned row and returns 500 if assignment fails, preserving the account for owner repair rather than deleting it. All other behavior remains unchanged.

## Pre-application account audit
All 10 existing privileged rows were reviewed. Seven lacked independent creator attribution; complete IDs/emails/timestamps and full reviewed SQL are retained in `.lovable/plan/security-only-signup-role-fix-sql-review-before-application-2026-10-18.md`. Only system and persistent-test accounts had privileged metadata. Attribution is incomplete and metadata is editable: these are review candidates, not proven attacks. Existing records were not altered.

## Verification
- Live function readback matches the old function byte-for-byte after replacing the single new CASE expression with the old expression (ignoring PostgreSQL's omitted trailing delimiter).
- 12 live database tests: three allowed roles, four denied privileged roles, empty/unknown/uppercase/missing defaults and unchanged remaining function.
- 6 actual create-user handler tests: exact admin/owner/vendor roles, existing admin authorization, assignment failure, non-admin caller rejection.
- Real public signup with admin metadata produced exactly supporter; bestie signup retained bestie. Both profiles preserved first/last name, generated display name, avatar 4 and friend codes.
- Real owner-authenticated create-user calls returned 200 for admin/owner/vendor; each has exactly the requested role and authenticated created_by. Vendor record is approved as before.
- Signed-in admin Users table read back all five roles; screenshot `/tmp/browser/signup-security/3_admin_role_readback.png`, request/row evidence `/tmp/browser/signup-security/evidence.json`.
- Fresh public test-account UI sign-in did not reach community within 45 seconds; no UI fix was attempted. Signed-in owner readback succeeded. Public test-account redirect/terms flow is not claimed verified.
- Five newly created test accounts are retained; no preexisting account or financial record changed/deleted.
- create-user deployment source SHA-256: `3e47e023dd1a1fdd20a38166a34aaab6ead6b9a1c5692d0a386e95b55af8ff36`.

## Evidence rows
- public_signup requested admin: `6279ff5f-36fd-48a1-83a5-0b30076c13f5` → [{'role': 'supporter'}]
- public_signup requested bestie: `4cf2def0-850d-4eaa-be16-2ab6570cee73` → [{'role': 'bestie'}]
- trusted_create requested admin: `517a6211-8678-47d0-8183-c58bd77fd2eb` → [{'role': 'admin', 'created_by': 'ad688e57-6077-455b-853b-a0fd0b458c2e'}]
- trusted_create requested owner: `40a9e656-6339-45e5-96ff-909bd53e4cfa` → [{'role': 'owner', 'created_by': 'ad688e57-6077-455b-853b-a0fd0b458c2e'}]
- trusted_create requested vendor: `fe0b7397-c04b-4832-b4c0-2ec9210bc49c` → [{'role': 'vendor', 'created_by': 'ad688e57-6077-455b-853b-a0fd0b458c2e'}]

## Scope boundaries
Auth.tsx and VendorAuth.tsx untouched. No UI changes. Other system/test provisioners explicitly insert privileged roles but may retain supporter alongside them on future creation; left unchanged as requested. Existing create-user permission to let admins request privileged roles is preserved, not expanded or redesigned.
