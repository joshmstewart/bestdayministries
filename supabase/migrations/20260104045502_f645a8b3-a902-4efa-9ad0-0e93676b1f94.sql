-- Add tools column to public_recipes
ALTER TABLE public.public_recipes
ADD COLUMN tools TEXT[] DEFAULT '{}';

-- Add tools column to saved_recipes
ALTER TABLE public.saved_recipes
ADD COLUMN tools TEXT[] DEFAULT '{}';