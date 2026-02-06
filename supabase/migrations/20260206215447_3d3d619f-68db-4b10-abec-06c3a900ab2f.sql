
-- Add crop settings to fitness_avatars for circular profile display
ALTER TABLE public.fitness_avatars
  ADD COLUMN IF NOT EXISTS profile_crop_x real NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS profile_crop_y real NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS profile_crop_scale real NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.fitness_avatars.profile_crop_x IS 'Horizontal position % (0-100) for circular crop';
COMMENT ON COLUMN public.fitness_avatars.profile_crop_y IS 'Vertical position % (0-100) for circular crop';
COMMENT ON COLUMN public.fitness_avatars.profile_crop_scale IS 'Zoom scale (1-3) for circular crop';
