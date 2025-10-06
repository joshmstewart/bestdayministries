-- Add Support Us navigation link with first admin as creator
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get first admin or owner user
  SELECT user_id INTO admin_user_id
  FROM public.user_roles
  WHERE role IN ('admin', 'owner')
  LIMIT 1;

  -- If no admin found, use a placeholder (will be updated by first admin who edits)
  IF admin_user_id IS NULL THEN
    -- Get any user
    SELECT user_id INTO admin_user_id
    FROM public.user_roles
    LIMIT 1;
  END IF;

  -- Insert the navigation link only if we have a user ID
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.navigation_links (label, href, display_order, is_active, visible_to_roles, created_by)
    VALUES (
      'Support Us',
      '/support',
      50,
      true,
      ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner', 'vendor']::user_role[],
      admin_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;