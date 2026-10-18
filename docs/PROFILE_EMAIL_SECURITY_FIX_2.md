# Security Fix 2 — applied state and resumed verification

## What was already changed before the resume request

The fix was applied on 2026-10-18, not stopped at pre-flight. Read-only Git inspection establishes merge commit `d4b9020d8af7ea45048f8ba34d046376cf7fe0a4` and its component commits. No new migration or application change was needed on resume.

### Applied migration

`drizzle/migrations/0007_remove_public_profile_email_leak.sql`, committed as `02a47a18`, contains exactly:

```sql
DROP POLICY "Authenticated users can search by friend code" ON public.profiles;
COMMENT ON VIEW public.profiles_public IS 'Public display-only profile projection. Never add email, friend_code, or private preferences. Friend-code discovery uses authenticated SECURITY DEFINER RPCs.';
```

Live migration ledger entry `id=8`, `created_at=1792361176251`, hash `a44d809bdcc89aebd90f5669d696811decb56672719d1201d42b782ecc4f3edc` matches the file SHA-256. Live policy inventory confirms the dropped policy is absent. Generated migration metadata changed in `drizzle/migrations/meta/0007_snapshot.json` and `drizzle/migrations/meta/_journal.json`.

### Application files previously changed

Commit `998a0d26`, followed by small corrections in `e44c0680`, changed these 21 files:

- `src/components/beat-pad/BeatPadGallery.tsx`
- `src/components/cash-register/CashRegisterLeaderboard.tsx`
- `src/components/cash-register/TimeTrialLeaderboard.tsx`
- `src/components/chores/ChallengeGallery.tsx`
- `src/components/coloring-book/ColoringCommunityGallery.tsx`
- `src/components/daily-features/FortuneComments.tsx`
- `src/components/drink-creator/DrinkGallery.tsx`
- `src/components/joke-generator/JokeCommunityGallery.tsx`
- `src/components/prayer-requests/AnsweredPrayersGallery.tsx`
- `src/components/prayer-requests/CommunityPrayers.tsx`
- `src/components/vendor/VendorBestieAssetManager.tsx`
- `src/components/vendor/VendorBestieAssetSelector.tsx`
- `src/components/vendor/VendorLinkedBesties.tsx`
- `src/components/vendor/VendorOrderDetails.tsx`
- `src/components/vendor/VendorOrderList.tsx`
- `src/components/vendor/VendorTeamManager.tsx`
- `src/components/wordle/WordleLeaderboard.tsx`
- `src/components/workout/WorkoutImageGallery.tsx`
- `src/pages/GuardianLinks.tsx`
- `src/pages/ProfileSettings.tsx`
- `src/pages/RecipeGallery.tsx`

Display-only queries use `profiles_public`. ProfileSettings generates a random friend code, updates only the current user's profile, and retries error `23505` up to 100 attempts; it no longer scans other profiles. The live `unique_friend_code` index still enforces uniqueness. Server-side signup uniqueness checks are intentionally unchanged.

### Other files already changed in the Fix 2 merge

- `.lovable/audit-checklist.md`
- `AGENTS.md`
- `docs/AUTH_SYSTEM_CONCISE.md`
- `docs/BESTIE_LINKING_CONCISE.md`
- `docs/OPTION_1_PLUS_IMPLEMENTATION.md`
- `roadmap.md`
- `tests/security/profile_privacy_test.py`
- `tests/security/__pycache__/profile_privacy_test.cpython-313.pyc` (generated artifact was previously committed; not removed on resume)

The existing safe view and lookup/link RPCs predate migration 0007; they were not recreated by this migration. Auth.tsx, VendorAuth.tsx, and edge functions were not changed by Fix 2.

## Before / after / resumed live evidence

| Read | Before removal | Immediately after | Resume 2026-10-18 |
| --- | --- | --- | --- |
| Supporter `profiles?select=id,email` | HTTP 200, 328 rows, 327 other-member emails | HTTP 200, 1 own row, 0 other-member emails | HTTP 200, 1 own row, 0 other-member emails |
| Anonymous `sponsorships?select=sponsor_email` | HTTP 200, 0 rows | HTTP 200, 0 rows | HTTP 200, 0 rows |

Evidence: `/tmp/browser/profile-privacy/before.json`, `after.json`, `resumed.json`. The supporter role was verified by its own `user_roles` read. No emails are included in these evidence summaries.

All four existing read-only live regression tests passed again:

`python3 -m unittest discover -s tests/security -p profile_privacy_test.py -v`

Browser-origin reads independently confirmed the same supporter/anonymous results and 328 public display rows without email or friend_code. Evidence: `/tmp/browser/profile-privacy-resume/browser-evidence.json`, screenshot `state.png`. Own profile data rendered at `/profile`; an existing Terms & Privacy acceptance modal blocked further interaction. All browser non-GET/HEAD/OPTIONS requests were blocked to honor the no-data-change instruction. Terms were not accepted or recorded. No page errors were observed. Full authenticated UI interaction is therefore not claimed.

Additional read-only REST checks (`rpc-evidence.json`): anonymous exact-code lookup denied HTTP 401 / `42501`; authenticated empty-code lookup HTTP 200 with zero rows; public-view email and friend_code projections rejected HTTP 400 / `42703`.

## Preserved access and consumer audit

Live `profiles` retains six SELECT policies, unchanged by migration 0007:

- Admins can view all profiles — `has_admin_access(auth.uid())`.
- Users can view their own profile — `auth.uid() = id`.
- Caregivers can view linked besties profiles — matching caregiver_bestie_links relationship.
- Besties can view linked caregivers profiles — reverse relationship.
- Sponsors can view sponsored besties profiles — active sponsorship matching sponsor_id and bestie_id.
- Vendors can view linked besties profiles — approved request matching vendor owner and bestie.

Live sponsorships retains its three existing SELECT policies: admin access, sponsor own-ID/email access, and `can_view_sponsorship` accessible relationships. No sponsorship policy changed on resume.

Read-only relationship checks found 14 existing guardian relationships and 9 active sponsor relationships with profile targets; all admin/owner IDs satisfy `has_admin_access`. There are zero approved vendor relationships to exercise. These are predicate/data checks, not impersonated role REST tests.

`service_role` has SELECT privilege and RLS bypass. Both existing friend-code RPCs are SECURITY DEFINER with `search_path=public`; anonymous execution is denied, authenticated execution is allowed, and their explicit ACLs contain no PUBLIC execute grant.

The resumed code audit found no remaining direct client profiles query clearly serving arbitrary other-member display. Own-profile reads remain ID-scoped. VendorDashboard's private SELECT is its own homepage preference; its other direct reference is an own-profile UPDATE. Newsletter recipient email/count queries are used by the admin newsletter campaigns screen and retain the admin policy. Service/edge reads remain unchanged. Generic display fields are exactly id, display_name, avatar_number, avatar_url, bio, profile_avatar_id, custom_avatar_url, custom_avatar_type, role; no email or friend_code.

## Limits and changes on resume

- No migration reapplied; no application, UI, user, financial, or relationship data changed.
- Resume writes are this evidence document plus targeted checklist/roadmap evidence updates.
- Full linked guardian/sponsor/vendor/admin/service-role end-to-end UI checks remain unverified. No approved vendor fixture exists, and none was created.
- Final automatic build log reports `build OK` at 2026-10-18T22:37:52Z; runtime-errors log unavailable. No application edits or manual build/typecheck were run on resume.