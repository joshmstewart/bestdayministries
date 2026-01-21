-- Add character_type column to fitness_avatars for list-view regeneration
ALTER TABLE public.fitness_avatars
ADD COLUMN IF NOT EXISTS character_type TEXT DEFAULT 'human';

-- Add comment for documentation
COMMENT ON COLUMN public.fitness_avatars.character_type IS 'Avatar type: human, animal, superhero, or monster. Used for image regeneration.';