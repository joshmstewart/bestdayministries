-- Drop and recreate the policy with proper empty array handling
DROP POLICY IF EXISTS "Sticker collections viewable by authorized roles" ON sticker_collections;

CREATE POLICY "Sticker collections viewable by authorized roles"
ON sticker_collections
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND visible_to_roles IS NOT NULL
  AND COALESCE(array_length(visible_to_roles, 1), 0) > 0
  AND get_user_role(auth.uid()) = ANY(visible_to_roles)
);