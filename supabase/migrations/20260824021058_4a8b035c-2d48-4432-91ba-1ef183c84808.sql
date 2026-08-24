-- 1. Remove PII (email) and the linking secret (friend_code) from the public view
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT p.id,
       p.display_name,
       p.avatar_number,
       p.avatar_url,
       p.bio,
       p.profile_avatar_id,
       p.custom_avatar_url,
       p.custom_avatar_type,
       ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT SELECT ON public.profiles_public TO service_role;

-- 2. Exact-match friend code lookup (no enumeration possible)
CREATE OR REPLACE FUNCTION public.find_bestie_by_friend_code(_friend_code text)
RETURNS TABLE (
  id uuid,
  display_name text,
  bio text,
  avatar_number integer,
  avatar_url text,
  profile_avatar_id uuid,
  custom_avatar_url text,
  custom_avatar_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.bio, p.avatar_number, p.avatar_url,
         p.profile_avatar_id, p.custom_avatar_url, p.custom_avatar_type
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND _friend_code IS NOT NULL
    AND length(_friend_code) > 0
    AND p.friend_code = _friend_code
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'bestie'
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_bestie_by_friend_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_bestie_by_friend_code(text) TO authenticated, service_role;

-- 3. Link creation requires knowing the friend code
CREATE OR REPLACE FUNCTION public.link_bestie_by_friend_code(_friend_code text, _relationship text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _bestie uuid;
  _link uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.has_role(_caller, 'caregiver') OR public.has_admin_access(_caller)) THEN
    RAISE EXCEPTION 'Only caregivers can link a bestie account';
  END IF;

  IF _relationship IS NULL OR length(trim(_relationship)) = 0 THEN
    RAISE EXCEPTION 'Relationship is required';
  END IF;

  SELECT p.id INTO _bestie
  FROM public.profiles p
  WHERE p.friend_code = _friend_code
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'bestie')
  LIMIT 1;

  IF _bestie IS NULL THEN
    RAISE EXCEPTION 'Friend code not found';
  END IF;

  IF _bestie = _caller THEN
    RAISE EXCEPTION 'You cannot link to yourself';
  END IF;

  SELECT id INTO _link FROM public.caregiver_bestie_links
  WHERE caregiver_id = _caller AND bestie_id = _bestie;

  IF _link IS NOT NULL THEN
    RAISE EXCEPTION 'Link already exists';
  END IF;

  INSERT INTO public.caregiver_bestie_links (caregiver_id, bestie_id, relationship)
  VALUES (_caller, _bestie, trim(_relationship))
  RETURNING id INTO _link;

  RETURN _link;
END;
$$;

REVOKE ALL ON FUNCTION public.link_bestie_by_friend_code(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.link_bestie_by_friend_code(text, text) TO authenticated, service_role;

-- 4. Direct inserts into caregiver_bestie_links are now admin-only
DROP POLICY IF EXISTS "Caregivers and admins can create links" ON public.caregiver_bestie_links;
CREATE POLICY "Admins can create links directly"
ON public.caregiver_bestie_links
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

-- 5. Clean up audit probe row
DELETE FROM public.caregiver_bestie_links WHERE relationship = 'audit probe';