-- Add sex column to fitness_avatars table for anatomical consistency
-- Values: 'male', 'female', or null (unspecified/non-applicable for monsters/animals)
ALTER TABLE public.fitness_avatars 
ADD COLUMN sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female'));

-- Add a comment explaining the column
COMMENT ON COLUMN public.fitness_avatars.sex IS 'Biological sex for anatomical consistency in AI image generation. Use male/female for human/superhero characters, null for animals/monsters.';