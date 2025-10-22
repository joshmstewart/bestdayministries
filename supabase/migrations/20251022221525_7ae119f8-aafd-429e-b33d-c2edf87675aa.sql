-- Add visible_to_roles column to store_items table
ALTER TABLE store_items 
ADD COLUMN visible_to_roles user_role[] 
DEFAULT ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[];

-- Update existing items to be visible to all roles by default
UPDATE store_items 
SET visible_to_roles = ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::user_role[]
WHERE visible_to_roles IS NULL;

-- Drop the old RLS policy
DROP POLICY IF EXISTS "Store items viewable by everyone" ON store_items;

-- Create new RLS policy that checks visible_to_roles
CREATE POLICY "Store items viewable by role" ON store_items
  FOR SELECT USING (
    is_active = true 
    AND (
      get_user_role(auth.uid()) = ANY(visible_to_roles)
      OR has_admin_access(auth.uid())
    )
  );