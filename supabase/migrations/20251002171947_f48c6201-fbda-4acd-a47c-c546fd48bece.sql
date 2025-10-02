-- ========================================
-- FIX: Security Definer Views
-- Change views to use security invoker instead
-- ========================================

-- Fix profiles_with_roles view to use security invoker
DROP VIEW IF EXISTS public.profiles_with_roles;

CREATE VIEW public.profiles_with_roles 
WITH (security_invoker = true)
AS
SELECT 
  p.*,
  ur.role as current_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id;

-- Ensure profiles_public uses security invoker (already set in previous migration, but double-check)
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  bio,
  avatar_url,
  avatar_number,
  role,
  created_at
FROM public.profiles;

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_with_roles TO authenticated;
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;