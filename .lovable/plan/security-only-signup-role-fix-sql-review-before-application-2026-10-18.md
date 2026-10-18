# Security-only signup role fix — SQL review before application

## Scope
- Apply only the metadata role allowlist in `public.handle_new_user` and trusted privileged assignment in `supabase/functions/create-user`.
- No UI changes. Do not edit Auth.tsx or VendorAuth.tsx. Do not change or delete any existing accounts or role rows.
- Keep the trigger's profile creation, avatars, names, display names, friend codes, SECURITY DEFINER and search_path byte-identical outside the single role expression.

## Existing privileged-account audit
Checked all **10** current admin/owner/moderator role rows against account metadata and `user_roles.created_by`. Three have another account recorded as the role creator. The following seven lack independent creator attribution; this is a review list, **not proof of malicious signup**. `created_at` is account creation time, UTC.

| User ID | Email | created_at | Current role | Evidence |
|---|---|---|---|---|
| ad688e57-6077-455b-853b-a0fd0b458c2e | stewart.m.joshua@gmail.com | 2025-10-01 01:28:25.291840+00 | owner | created_by null; signup role supporter |
| 21324cb1-30dc-4c0f-8126-9a9de6867919 | marla@joyhousestore.com | 2025-10-02 01:14:00.126365+00 | owner | created_by null; signup role caregiver |
| 2f10893d-5884-4956-897c-c06c175f7e7c | system@bestdayministries.app | 2026-02-01 21:58:44.571089+00 | owner | self-attributed; signup role owner; matches system provisioner |
| 23d93b03-423c-4e29-a21d-cf99dc2175c5 | testadmin@example.com | 2026-03-04 18:32:01.508803+00 | admin | self-attributed; signup role admin; matches persistent test provisioner |
| ab95b1b6-0282-4f4a-8f6d-3b071b7643e2 | emailtest-moderator-1784226811@example.com | 2026-07-16 18:33:35.561625+00 | moderator | created_by null; signup role supporter |
| 0afd76f8-d63b-4439-84ca-19b5b06502af | emailtest-admin-1784226923@example.com | 2026-07-16 18:35:28.031763+00 | admin | created_by null; signup role supporter |
| 6b96ea1a-3519-499d-9f7f-006af58e2d05 | emailtest-owner-1784227068@example.com | 2026-07-16 18:37:52.736142+00 | owner | created_by null; signup role supporter |

Only two current privileged accounts also have privileged signup metadata: the system and persistent-test accounts above. Metadata is user-editable and creator attribution is incomplete, so neither metadata nor a null creator proves how an account originally obtained privileges. No records were changed.

## SECURITY CHANGE PRE-FLIGHT
1. Affected tables: new-user inserts into profiles and user_roles through the existing auth.users lifecycle trigger; no table schema changes.
2. Policies: none added, removed or modified. Existing grants and role enum unchanged. Live enum includes vendor and moderator.
3. Consumer audit: Auth.tsx and VendorAuth.tsx send bestie/caregiver/supporter; create-user currently trusts the trigger and needs explicit privileged replacement. AuthContext and role-reading hooks/pages consume user_roles; profiles_public joins that table. Existing database helpers include has_admin_access, is_owner, is_admin_or_owner, get_user_role, find_bestie_by_friend_code and link_bestie_by_friend_code; notification helpers also reference roles. Existing FKs reference auth.users for user_id and created_by; no FK targeting user_roles was found. Other policies reference user_roles but none will be modified.
4. Role access: anonymous public reads unchanged; new ordinary authenticated users preserve bestie/caregiver/supporter; existing bestie, caregiver, supporter, moderator, admin, owner and vendor accounts remain unchanged. Forged privileged metadata intentionally yields supporter.
5. Cross-system flows: profile/friend-code creation, linking, terms, sponsorship, vendor onboarding and notifications retain their existing code. Runtime regression validation follows application; source audit is not an end-to-end claim.
6. Exact role query: trigger INSERT into user_roles currently casts metadata directly; afterward only three permitted strings cast, every other/missing value becomes supporter. create-user's existing caller role lookup remains unchanged; its new privileged replacement targets only the just-created user's supporter row.
7. Ready: ready for review; nothing applied. Apply only after this SQL is reviewed.

## Exact proposed migration SQL
The live function definition matches the cited migration. Only the role expression changes:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_friend_code TEXT;
  avatar_url_value TEXT;
  avatar_num INTEGER;
  profile_avatar_id_value UUID;
  first_name_value TEXT;
  last_name_value TEXT;
  display_name_value TEXT;
  attempt INTEGER := 0;
  emoji_set TEXT[] := ARRAY['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡', '🎨', '🎭', '🎪', '🏰', '🌵', '🦋', '🐉', '🎯', '🎺', '🌴'];
BEGIN
  -- Generate a UNIQUE random emoji friend code.
  -- 20^3 = 8000 combinations only, so blind generation collided with an
  -- existing code and aborted the whole signup with a 23505 error.
  LOOP
    attempt := attempt + 1;
    new_friend_code := emoji_set[1 + floor(random() * 20)::int] ||
                       emoji_set[1 + floor(random() * 20)::int] ||
                       emoji_set[1 + floor(random() * 20)::int];

    -- After 40 tries fall back to a 4-emoji code (160k combinations)
    IF attempt > 40 THEN
      new_friend_code := new_friend_code || emoji_set[1 + floor(random() * 20)::int];
    END IF;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.friend_code = new_friend_code
    );

    IF attempt > 80 THEN
      RAISE EXCEPTION 'Unable to generate a unique friend code';
    END IF;
  END LOOP;

  -- Extract avatar data if present
  avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';

  IF avatar_url_value IS NOT NULL AND avatar_url_value LIKE 'avatar-%' THEN
    avatar_num := substring(avatar_url_value FROM 'avatar-(\d+)')::INTEGER;
  ELSE
    avatar_num := NULL;
  END IF;

  IF NEW.raw_user_meta_data->>'profile_avatar_id' IS NOT NULL THEN
    profile_avatar_id_value := (NEW.raw_user_meta_data->>'profile_avatar_id')::UUID;
  ELSE
    profile_avatar_id_value := NULL;
  END IF;

  first_name_value := NEW.raw_user_meta_data->>'first_name';
  last_name_value := NEW.raw_user_meta_data->>'last_name';

  IF first_name_value IS NOT NULL AND last_name_value IS NOT NULL THEN
    display_name_value := first_name_value || ' ' || LEFT(last_name_value, 1);
  ELSE
    display_name_value := COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member');
  END IF;

  INSERT INTO public.profiles (id, display_name, first_name, last_name, email, friend_code, avatar_number, profile_avatar_id)
  VALUES (
    NEW.id,
    display_name_value,
    first_name_value,
    last_name_value,
    NEW.email,
    new_friend_code,
    avatar_num,
    profile_avatar_id_value
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      friend_code = COALESCE(profiles.friend_code, EXCLUDED.friend_code),
      avatar_number = EXCLUDED.avatar_number,
      profile_avatar_id = COALESCE(EXCLUDED.profile_avatar_id, profiles.profile_avatar_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('bestie', 'caregiver', 'supporter')
        THEN (NEW.raw_user_meta_data->>'role')::user_role
      ELSE 'supporter'::user_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;```

## Trusted admin-created accounts
After the existing authenticated admin/owner check and successful account creation, for requested admin/owner/vendor only, replace the newly inserted supporter role **in place** with the requested role and set `created_by` to the authenticated creator. A single scoped UPDATE removes the supporter assignment while setting the requested role atomically, avoiding an insert/delete gap. Require one returned row and fail clearly if assignment fails; never return success for a wrong role. Keep vendor record creation and newsletter behavior unchanged. Do not alter existing caller authorization rules.

## Verification and documentation
- Add focused regression tests for all three accepted roles; admin/owner/moderator/vendor, missing, empty and unknown metadata all become supporter without enum-cast errors.
- Verify profile fields and all other trigger statements remain identical; test privileged replacement uses only the newly created account and yields exactly the requested role, with failure handled.
- Read back deployed function and run controlled signup/admin-create checks; preserve all existing accounts. Revert immediately if the security change regresses legitimate flows.
- Update auth documentation, edge-function reference, master documentation, test tracker and AGENTS.md only for this fix.
- Other system/test provisioners already assign roles explicitly but can retain an extra supporter role on future creation; report that out-of-scope risk rather than silently changing them.
