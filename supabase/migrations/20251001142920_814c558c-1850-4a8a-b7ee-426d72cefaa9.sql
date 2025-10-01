-- Drop the overly permissive policy that allows public access to profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new policy that requires authentication to view profiles
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Also fix the discussion_comments table to require authentication
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.discussion_comments;

CREATE POLICY "Authenticated users can view comments"
ON public.discussion_comments
FOR SELECT
TO authenticated
USING (true);