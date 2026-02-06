
-- Fix profiles_public view to include all columns that code references
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_number,
  p.avatar_url,
  p.bio,
  p.friend_code,
  p.email,
  p.profile_avatar_id,
  p.custom_avatar_url,
  p.custom_avatar_type,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id;
