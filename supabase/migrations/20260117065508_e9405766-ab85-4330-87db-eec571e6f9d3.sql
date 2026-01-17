-- Add location_id to track which location was used (for getting pack name)
ALTER TABLE public.workout_generated_images 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES workout_locations(id);

-- Add location_pack_name to cache the pack name at generation time
ALTER TABLE public.workout_generated_images 
ADD COLUMN IF NOT EXISTS location_pack_name TEXT;