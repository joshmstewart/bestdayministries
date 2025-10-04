-- Update profiles_public view to include friend_code
DROP VIEW IF EXISTS profiles_public;

CREATE VIEW profiles_public AS
SELECT 
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.avatar_number,
  p.friend_code,
  p.created_at,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id;