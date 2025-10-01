-- Add policies for admins and owners to manage flagged content

-- Allow admins and owners to update post moderation status
CREATE POLICY "Admins can approve posts"
ON public.discussion_posts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Allow admins and owners to delete posts
CREATE POLICY "Admins can delete posts"
ON public.discussion_posts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Allow admins to update comment moderation status
CREATE POLICY "Admins can approve comments"
ON public.discussion_comments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Allow admins to delete comments
CREATE POLICY "Admins can delete comments"
ON public.discussion_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);