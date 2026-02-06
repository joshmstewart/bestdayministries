
-- Phase 1: Add profile_avatar_id to profiles table
-- This will become the single source of truth for a user's display avatar

-- Add the column
ALTER TABLE public.profiles
ADD COLUMN profile_avatar_id UUID REFERENCES public.fitness_avatars(id) ON DELETE SET NULL;

-- Migrate users who already have a selected fitness avatar
UPDATE public.profiles p
SET profile_avatar_id = ufa.avatar_id
FROM public.user_fitness_avatars ufa
WHERE ufa.user_id = p.id
  AND ufa.is_selected = true;

-- Drop and recreate profiles_public view to include the new column
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  id,
  display_name,
  avatar_number,
  avatar_url,
  bio,
  profile_avatar_id
FROM public.profiles;

-- Add index for faster lookups
CREATE INDEX idx_profiles_profile_avatar_id ON public.profiles(profile_avatar_id) WHERE profile_avatar_id IS NOT NULL;
