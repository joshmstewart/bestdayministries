-- Create or replace function to check if user is a guardian of another user
CREATE OR REPLACE FUNCTION public.is_guardian_of(_guardian_id uuid, _bestie_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.caregiver_bestie_links
    WHERE caregiver_id = _guardian_id
      AND bestie_id = _bestie_id
  )
$$;

-- Drop and recreate discussion_posts policies
DROP POLICY IF EXISTS "Posts viewable by authorized roles" ON public.discussion_posts;
DROP POLICY IF EXISTS "Guardians can approve posts" ON public.discussion_posts;

CREATE POLICY "Posts viewable by authorized roles" ON public.discussion_posts
FOR SELECT USING (
  (approval_status = 'approved' AND (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
        OR role = ANY (discussion_posts.visible_to_roles))
    )
  ))
  OR
  ((approval_status IN ('pending_approval', 'rejected')) AND (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
    )
    OR public.is_guardian_of(auth.uid(), author_id)
  ))
);

CREATE POLICY "Guardians and admins can update posts" ON public.discussion_posts
FOR UPDATE USING (
  auth.uid() = author_id
  OR public.is_guardian_of(auth.uid(), author_id)
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
  )
);

-- Drop and recreate discussion_comments policies  
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.discussion_comments;
DROP POLICY IF EXISTS "Guardians can approve comments" ON public.discussion_comments;

CREATE POLICY "Authenticated users can view comments" ON public.discussion_comments
FOR SELECT USING (
  approval_status = 'approved'
  OR
  ((approval_status IN ('pending_approval', 'rejected')) AND (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
    )
    OR public.is_guardian_of(auth.uid(), author_id)
  ))
);

CREATE POLICY "Guardians and admins can update comments" ON public.discussion_comments
FOR UPDATE USING (
  auth.uid() = author_id
  OR public.is_guardian_of(auth.uid(), author_id)
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
  )
);