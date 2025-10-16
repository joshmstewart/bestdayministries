-- Add visible_to_roles column to sticker_collections table
ALTER TABLE sticker_collections
ADD COLUMN IF NOT EXISTS visible_to_roles user_role[] DEFAULT ARRAY['admin'::user_role, 'owner'::user_role];

-- Update RLS policy for sticker collections to respect role visibility
DROP POLICY IF EXISTS "Sticker collections viewable by everyone" ON sticker_collections;

CREATE POLICY "Sticker collections viewable by authorized roles"
ON sticker_collections
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    has_admin_access(auth.uid())
    OR get_user_role(auth.uid()) = ANY(visible_to_roles)
  )
);