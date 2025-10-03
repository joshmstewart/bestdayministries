-- Add visible_to_roles column to albums table
ALTER TABLE public.albums
ADD COLUMN visible_to_roles user_role[] DEFAULT ARRAY['caregiver'::user_role, 'bestie'::user_role, 'supporter'::user_role, 'admin'::user_role, 'owner'::user_role];

-- Update RLS policy to check visible_to_roles
DROP POLICY IF EXISTS "Albums viewable by everyone" ON public.albums;

CREATE POLICY "Albums viewable by authorized roles"
ON public.albums
FOR SELECT
USING (
  (is_active = true) AND 
  (
    is_public = true OR
    has_admin_access(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = ANY(albums.visible_to_roles)
    )
  )
);