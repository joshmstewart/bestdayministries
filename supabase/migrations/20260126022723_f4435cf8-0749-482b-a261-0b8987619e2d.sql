-- Add location tracking columns to chore_celebration_images
ALTER TABLE chore_celebration_images 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES workout_locations(id),
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS location_pack_name TEXT;

-- Add index for location lookups
CREATE INDEX IF NOT EXISTS idx_chore_celebration_images_location_id 
ON chore_celebration_images(location_id);