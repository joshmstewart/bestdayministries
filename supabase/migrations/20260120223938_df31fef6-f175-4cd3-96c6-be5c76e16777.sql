-- Add category column to fitness_avatars for grouping in the picker
ALTER TABLE public.fitness_avatars 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'free';

-- Add a comment to explain the purpose
COMMENT ON COLUMN public.fitness_avatars.category IS 'Display category/group for the avatar picker (e.g., free, animals, superheroes, humans)';

-- Create an index for efficient filtering by category
CREATE INDEX IF NOT EXISTS idx_fitness_avatars_category ON public.fitness_avatars(category);

-- Update existing avatars based on their characteristics
-- Free avatars stay as 'free' (the default)
-- Others will be categorized based on their prompts
UPDATE public.fitness_avatars
SET category = 'animals'
WHERE is_active = true 
  AND is_free = false
  AND (
    LOWER(character_prompt) LIKE '%animal%'
    OR LOWER(character_prompt) LIKE '%dog%'
    OR LOWER(character_prompt) LIKE '%cat%'
    OR LOWER(character_prompt) LIKE '%bear%'
    OR LOWER(character_prompt) LIKE '%rabbit%'
    OR LOWER(character_prompt) LIKE '%fox%'
    OR LOWER(character_prompt) LIKE '%lion%'
    OR LOWER(character_prompt) LIKE '%tiger%'
    OR LOWER(character_prompt) LIKE '%panda%'
    OR LOWER(character_prompt) LIKE '%koala%'
    OR LOWER(character_prompt) LIKE '%owl%'
    OR LOWER(character_prompt) LIKE '%penguin%'
    OR LOWER(character_prompt) LIKE '%dolphin%'
    OR LOWER(character_prompt) LIKE '%elephant%'
    OR LOWER(character_prompt) LIKE '%monkey%'
    OR LOWER(name) LIKE '%dog%'
    OR LOWER(name) LIKE '%cat%'
    OR LOWER(name) LIKE '%bear%'
    OR LOWER(name) LIKE '%rabbit%'
    OR LOWER(name) LIKE '%fox%'
    OR LOWER(name) LIKE '%panda%'
  );

UPDATE public.fitness_avatars
SET category = 'superheroes'
WHERE is_active = true 
  AND is_free = false
  AND category = 'free'  -- Only update if not already categorized
  AND (
    LOWER(character_prompt) LIKE '%superhero%'
    OR LOWER(character_prompt) LIKE '%super hero%'
    OR LOWER(character_prompt) LIKE '%cape%'
    OR LOWER(character_prompt) LIKE '%hero%'
    OR LOWER(name) LIKE '%hero%'
    OR LOWER(name) LIKE '%captain%'
    OR LOWER(name) LIKE '%super%'
  );

-- Keep free avatars as 'free' category
UPDATE public.fitness_avatars
SET category = 'free'
WHERE is_free = true;