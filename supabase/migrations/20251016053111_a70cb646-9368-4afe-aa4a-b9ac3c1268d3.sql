-- Update RLS policy to respect empty visible_to_roles (even for admins)
DROP POLICY IF EXISTS "Sticker collections viewable by authorized roles" ON sticker_collections;

CREATE POLICY "Sticker collections viewable by authorized roles"
ON sticker_collections
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    -- If visible_to_roles is not empty, check if user's role is in the array
    (
      visible_to_roles IS NOT NULL 
      AND array_length(visible_to_roles, 1) > 0
      AND get_user_role(auth.uid()) = ANY(visible_to_roles)
    )
    -- Allow admins to see collections that have visible_to_roles explicitly including admin/owner
    OR (
      has_admin_access(auth.uid())
      AND visible_to_roles IS NOT NULL
      AND array_length(visible_to_roles, 1) > 0
      AND (
        'admin'::user_role = ANY(visible_to_roles)
        OR 'owner'::user_role = ANY(visible_to_roles)
      )
    )
  )
);