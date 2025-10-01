-- Add visible_to_roles column to discussion_posts
ALTER TABLE discussion_posts 
ADD COLUMN visible_to_roles user_role[] DEFAULT ARRAY['caregiver', 'bestie', 'supporter', 'admin', 'owner']::user_role[];

-- Update RLS policy for viewing posts to check role visibility
DROP POLICY IF EXISTS "Posts viewable by everyone" ON discussion_posts;

CREATE POLICY "Posts viewable by authorized roles"
ON discussion_posts
FOR SELECT
USING (
  -- Always allow admins and owners
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'owner')
  )
  OR
  -- Check if user's role is in the visible_to_roles array
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY(discussion_posts.visible_to_roles)
  )
);