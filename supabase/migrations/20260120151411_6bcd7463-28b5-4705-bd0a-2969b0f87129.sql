-- Add visible_to_roles column to community_sections for role-based access control
ALTER TABLE public.community_sections 
ADD COLUMN visible_to_roles public.user_role[] DEFAULT NULL;

-- Set the newsfeed to be visible to all roles by default (NULL means all roles can see it)
-- Admin can later configure specific roles if needed

COMMENT ON COLUMN public.community_sections.visible_to_roles IS 'Array of roles that can see this section. NULL means visible to all authenticated users.';