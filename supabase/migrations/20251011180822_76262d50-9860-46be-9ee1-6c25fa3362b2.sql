-- Add SELECT policy for user_roles to allow users to view other users' roles
-- This is safe because role information is not sensitive and needed for linking
CREATE POLICY "Anyone authenticated can view user roles"
ON user_roles
FOR SELECT
TO authenticated
USING (true);