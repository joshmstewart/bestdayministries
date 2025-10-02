-- Add approval status fields to discussion_posts
ALTER TABLE public.discussion_posts
ADD COLUMN approval_status text NOT NULL DEFAULT 'approved',
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone,
ADD CONSTRAINT discussion_posts_approval_status_check 
  CHECK (approval_status IN ('approved', 'pending_approval', 'rejected'));

-- Add approval status fields to discussion_comments
ALTER TABLE public.discussion_comments
ADD COLUMN approval_status text NOT NULL DEFAULT 'approved',
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone,
ADD CONSTRAINT discussion_comments_approval_status_check 
  CHECK (approval_status IN ('approved', 'pending_approval', 'rejected'));

-- Create function to check if user is a guardian of another user
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

-- Update RLS policy for discussion_posts to include approval logic
DROP POLICY IF EXISTS "Posts viewable by authorized roles" ON public.discussion_posts;

CREATE POLICY "Posts viewable by authorized roles" ON public.discussion_posts
FOR SELECT USING (
  -- Approved posts are visible to everyone
  (approval_status = 'approved' AND (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
        OR role = ANY (discussion_posts.visible_to_roles))
    )
  ))
  OR
  -- Pending/rejected posts visible to author, their guardians, and admins
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

-- Update RLS policy for discussion_comments to include approval logic
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.discussion_comments;

CREATE POLICY "Authenticated users can view comments" ON public.discussion_comments
FOR SELECT USING (
  -- Approved comments are visible to everyone
  approval_status = 'approved'
  OR
  -- Pending/rejected comments visible to author, their guardians, and admins
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

-- Add policy for guardians to update approval status on posts
CREATE POLICY "Guardians can approve posts" ON public.discussion_posts
FOR UPDATE USING (
  public.is_guardian_of(auth.uid(), author_id)
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
  )
);

-- Add policy for guardians to update approval status on comments
CREATE POLICY "Guardians can approve comments" ON public.discussion_comments
FOR UPDATE USING (
  public.is_guardian_of(auth.uid(), author_id)
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
  )
);