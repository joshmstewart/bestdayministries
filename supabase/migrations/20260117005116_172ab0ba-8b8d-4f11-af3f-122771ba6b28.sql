-- Add is_enabled column to user_workout_location_packs
ALTER TABLE public.user_workout_location_packs
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.user_workout_location_packs.is_enabled IS 'Whether this location pack is enabled for the user for image generation';