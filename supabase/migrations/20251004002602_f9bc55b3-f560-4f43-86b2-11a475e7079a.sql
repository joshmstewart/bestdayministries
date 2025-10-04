-- Step 1: Drop all RLS policies that depend on profiles.role
DROP POLICY IF EXISTS "Admins can delete any discussion images" ON storage.objects;
DROP POLICY IF EXISTS "Guardians and admins can create posts" ON discussion_posts;
DROP POLICY IF EXISTS "Posts viewable by authorized roles" ON discussion_posts;
DROP POLICY IF EXISTS "Guardians and admins can update posts" ON discussion_posts;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON discussion_comments;
DROP POLICY IF EXISTS "Guardians and admins can update comments" ON discussion_comments;
DROP POLICY IF EXISTS "Users can create sponsorships" ON sponsorships;
DROP POLICY IF EXISTS "Albums viewable by authorized roles" ON albums;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

-- Step 2: Recreate policies using get_user_role() and has_admin_access() functions

-- Storage policy for discussion images
CREATE POLICY "Admins can delete any discussion images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'discussion-images' AND
  has_admin_access(auth.uid())
);

-- Discussion posts policies
CREATE POLICY "Guardians and admins can create posts"
ON discussion_posts
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = 'caregiver' OR
  has_admin_access(auth.uid())
);

CREATE POLICY "Posts viewable by authorized roles"
ON discussion_posts
FOR SELECT
USING (
  (approval_status = 'approved' AND (
    has_admin_access(auth.uid()) OR
    get_user_role(auth.uid()) = ANY(visible_to_roles)
  )) OR
  (approval_status IN ('pending_approval', 'rejected') AND (
    auth.uid() = author_id OR
    has_admin_access(auth.uid()) OR
    is_guardian_of(auth.uid(), author_id)
  ))
);

CREATE POLICY "Guardians and admins can update posts"
ON discussion_posts
FOR UPDATE
USING (
  auth.uid() = author_id OR
  is_guardian_of(auth.uid(), author_id) OR
  has_admin_access(auth.uid())
);

-- Discussion comments policies
CREATE POLICY "Authenticated users can view comments"
ON discussion_comments
FOR SELECT
USING (
  (approval_status = 'approved') OR
  (approval_status IN ('pending_approval', 'rejected') AND (
    auth.uid() = author_id OR
    has_admin_access(auth.uid()) OR
    is_guardian_of(auth.uid(), author_id)
  ))
);

CREATE POLICY "Guardians and admins can update comments"
ON discussion_comments
FOR UPDATE
USING (
  auth.uid() = author_id OR
  is_guardian_of(auth.uid(), author_id) OR
  has_admin_access(auth.uid())
);

-- Sponsorships policy
CREATE POLICY "Users can create sponsorships"
ON sponsorships
FOR INSERT
WITH CHECK (
  auth.uid() = sponsor_id AND
  get_user_role(auth.uid()) IN ('supporter', 'caregiver', 'admin', 'owner')
);

-- Albums policy
CREATE POLICY "Albums viewable by authorized roles"
ON albums
FOR SELECT
USING (
  is_active = true AND (
    is_public = true OR
    has_admin_access(auth.uid()) OR
    get_user_role(auth.uid()) = ANY(visible_to_roles)
  )
);

-- Events policy
CREATE POLICY "Admins can delete events"
ON events
FOR DELETE
USING (
  has_admin_access(auth.uid())
);

-- Step 3: Update profiles_public view to use user_roles
DROP VIEW IF EXISTS profiles_public;

CREATE VIEW profiles_public AS
SELECT 
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.avatar_number,
  p.created_at,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id;

-- Step 4: Now we can safely drop the role column from profiles
ALTER TABLE profiles DROP COLUMN role;