-- Add visible_to_roles column to navigation_links table
ALTER TABLE navigation_links 
ADD COLUMN visible_to_roles user_role[] DEFAULT ARRAY['caregiver', 'bestie', 'supporter', 'admin', 'owner', 'vendor']::user_role[];

-- Set Marketplace link to only show for admins by default
UPDATE navigation_links 
SET visible_to_roles = ARRAY['admin', 'owner']::user_role[]
WHERE label = 'Marketplace' OR LOWER(label) LIKE '%marketplace%';