-- Update discussion_posts RLS to only allow guardians, admins, and owners to create posts

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.discussion_posts;

-- Create new policy for restricted post creation
CREATE POLICY "Guardians, admins and owners can create posts"
ON public.discussion_posts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('caregiver', 'admin', 'owner')
  )
);