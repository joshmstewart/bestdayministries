-- Feature 1: Video Screenshots/Cover Photo Selection
-- Add video cover/screenshot fields to discussion_posts
ALTER TABLE discussion_posts 
ADD COLUMN video_cover_url text,
ADD COLUMN video_cover_timestamp numeric;

-- Add video cover fields to videos table
ALTER TABLE videos
ADD COLUMN cover_url text,
ADD COLUMN cover_timestamp numeric;

-- Feature 2: Collaborative Editing and Ownership Transfer
-- Add collaborative editing fields to discussion_posts
ALTER TABLE discussion_posts
ADD COLUMN allow_admin_edit boolean NOT NULL DEFAULT false,
ADD COLUMN allow_owner_edit boolean NOT NULL DEFAULT false;

-- Add collaborative editing fields to albums
ALTER TABLE albums
ADD COLUMN allow_admin_edit boolean NOT NULL DEFAULT false,
ADD COLUMN allow_owner_edit boolean NOT NULL DEFAULT false;

-- Add collaborative editing fields to events
ALTER TABLE events
ADD COLUMN allow_admin_edit boolean NOT NULL DEFAULT false,
ADD COLUMN allow_owner_edit boolean NOT NULL DEFAULT false;

-- Add collaborative editing fields to featured_besties
ALTER TABLE featured_besties
ADD COLUMN allow_admin_edit boolean NOT NULL DEFAULT false,
ADD COLUMN allow_owner_edit boolean NOT NULL DEFAULT false;

-- Update RLS policies for discussion_posts to allow collaborative editing
DROP POLICY IF EXISTS "Authors can update their posts" ON discussion_posts;
DROP POLICY IF EXISTS "Guardians and admins can update posts" ON discussion_posts;

CREATE POLICY "Authors and collaborators can update posts"
ON discussion_posts
FOR UPDATE
USING (
  auth.uid() = author_id OR
  is_guardian_of(auth.uid(), author_id) OR
  (allow_admin_edit AND has_admin_access(auth.uid()) AND NOT is_owner(author_id)) OR
  (allow_owner_edit AND is_owner(auth.uid()))
);

-- Update RLS policies for albums to allow collaborative editing
DROP POLICY IF EXISTS "Admins can update albums" ON albums;

CREATE POLICY "Admins and collaborators can update albums"
ON albums
FOR UPDATE
USING (
  auth.uid() = created_by OR
  (allow_admin_edit AND has_admin_access(auth.uid()) AND NOT is_owner(created_by)) OR
  (allow_owner_edit AND is_owner(auth.uid()))
);

-- Update RLS policies for events to allow collaborative editing
DROP POLICY IF EXISTS "Event creators can update their events" ON events;
DROP POLICY IF EXISTS "Admins can update any event" ON events;

CREATE POLICY "Event creators and collaborators can update events"
ON events
FOR UPDATE
USING (
  auth.uid() = created_by OR
  (allow_admin_edit AND has_admin_access(auth.uid()) AND NOT is_owner(created_by)) OR
  (allow_owner_edit AND is_owner(auth.uid()))
)
WITH CHECK (
  auth.uid() = created_by OR
  (allow_admin_edit AND has_admin_access(auth.uid()) AND NOT is_owner(created_by)) OR
  (allow_owner_edit AND is_owner(auth.uid()))
);

-- Update RLS policies for featured_besties to allow collaborative editing  
DROP POLICY IF EXISTS "Admins can manage featured besties" ON featured_besties;

CREATE POLICY "Admins and collaborators can manage featured besties"
ON featured_besties
FOR ALL
USING (
  has_admin_access(auth.uid()) OR
  (allow_admin_edit AND has_admin_access(auth.uid())) OR
  (allow_owner_edit AND is_owner(auth.uid()))
)
WITH CHECK (
  has_admin_access(auth.uid()) OR
  (allow_admin_edit AND has_admin_access(auth.uid())) OR
  (allow_owner_edit AND is_owner(auth.uid()))
);

COMMENT ON COLUMN discussion_posts.video_cover_url IS 'Screenshot from video used as cover/preview image';
COMMENT ON COLUMN discussion_posts.video_cover_timestamp IS 'Timestamp in seconds where the cover screenshot was captured';
COMMENT ON COLUMN discussion_posts.allow_admin_edit IS 'Allow admins (not owners) to edit this post including changing the author';
COMMENT ON COLUMN discussion_posts.allow_owner_edit IS 'Allow owners to edit this post including changing the author';

COMMENT ON COLUMN albums.allow_admin_edit IS 'Allow admins (not owners) to edit this album including changing the creator';
COMMENT ON COLUMN albums.allow_owner_edit IS 'Allow owners to edit this album including changing the creator';

COMMENT ON COLUMN events.allow_admin_edit IS 'Allow admins (not owners) to edit this event including changing the creator';
COMMENT ON COLUMN events.allow_owner_edit IS 'Allow owners to edit this event including changing the creator';