-- Activate Christmas 2025 sticker collection and make it visible to all roles
-- This allows E2E tests to see multiple active collections

UPDATE sticker_collections 
SET 
  is_active = true,
  visible_to_roles = ARRAY['admin', 'owner', 'supporter', 'bestie', 'caregiver']::user_role[]
WHERE name = 'Christmas 2025';