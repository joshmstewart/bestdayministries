-- Drop and recreate profiles_public view to include user role
DROP VIEW IF EXISTS profiles_public CASCADE;

CREATE VIEW profiles_public AS
SELECT 
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.avatar_number,
  p.friend_code,
  p.email,
  p.created_at,
  p.updated_at,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
-- Only show the first role per user (in case they have multiple)
WHERE ur.id = (
  SELECT id 
  FROM user_roles 
  WHERE user_id = p.id 
  ORDER BY created_at 
  LIMIT 1
) OR ur.id IS NULL;