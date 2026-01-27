-- Fix profiles_public view to include all columns the app expects
DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_number,
  p.avatar_url,
  p.bio,
  p.email,
  p.friend_code,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id;