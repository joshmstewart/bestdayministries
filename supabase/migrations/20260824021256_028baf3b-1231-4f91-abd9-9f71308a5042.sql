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

  IF NOT (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _caller AND ur.role = 'caregiver'::public.user_role)
          OR public.has_admin_access(_caller)) THEN
    RAISE EXCEPTION 'Only caregivers can link a bestie account';
  END IF;

  IF _relationship IS NULL OR length(trim(_relationship)) = 0 THEN
    RAISE EXCEPTION 'Relationship is required';
  END IF;

  SELECT p.id INTO _bestie
  FROM public.profiles p
  WHERE p.friend_code = _friend_code
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'bestie'::public.user_role)
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