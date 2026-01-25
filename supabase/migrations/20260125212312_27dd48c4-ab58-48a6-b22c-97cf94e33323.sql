-- Update the sex column constraint to include androgynous option
ALTER TABLE public.fitness_avatars 
DROP CONSTRAINT IF EXISTS fitness_avatars_sex_check;

ALTER TABLE public.fitness_avatars 
ADD CONSTRAINT fitness_avatars_sex_check 
CHECK (sex IS NULL OR sex IN ('male', 'female', 'androgynous'));

-- Update the column comment
COMMENT ON COLUMN public.fitness_avatars.sex IS 'Biological sex for anatomical consistency in AI image generation. Use male/female/androgynous for human/superhero characters, null for animals/monsters.';