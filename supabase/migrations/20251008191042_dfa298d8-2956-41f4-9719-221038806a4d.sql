-- Drop existing policies
DROP POLICY IF EXISTS "Help tours viewable by everyone" ON public.help_tours;
DROP POLICY IF EXISTS "Help guides viewable by everyone" ON public.help_guides;
DROP POLICY IF EXISTS "Help FAQs viewable by everyone" ON public.help_faqs;

-- Create new policies that respect visible_to_roles AND allow guardians to see bestie content

-- Help Tours: Allow if user's role is in visible_to_roles OR if user is caregiver and 'bestie' is in visible_to_roles
CREATE POLICY "Help tours visible by role"
ON public.help_tours
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    get_user_role(auth.uid()) = ANY(visible_to_roles)
    OR (
      get_user_role(auth.uid()) = 'caregiver'
      AND 'bestie'::user_role = ANY(visible_to_roles)
    )
    OR has_admin_access(auth.uid())
  )
);

-- Help Guides: Allow if user's role is in visible_to_roles OR if user is caregiver and 'bestie' is in visible_to_roles
CREATE POLICY "Help guides visible by role"
ON public.help_guides
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    get_user_role(auth.uid()) = ANY(visible_to_roles)
    OR (
      get_user_role(auth.uid()) = 'caregiver'
      AND 'bestie'::user_role = ANY(visible_to_roles)
    )
    OR has_admin_access(auth.uid())
  )
);

-- Help FAQs: Allow if user's role is in visible_to_roles OR if user is caregiver and 'bestie' is in visible_to_roles
CREATE POLICY "Help FAQs visible by role"
ON public.help_faqs
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    get_user_role(auth.uid()) = ANY(visible_to_roles)
    OR (
      get_user_role(auth.uid()) = 'caregiver'
      AND 'bestie'::user_role = ANY(visible_to_roles)
    )
    OR has_admin_access(auth.uid())
  )
);