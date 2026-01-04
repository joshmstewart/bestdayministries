-- Add image_url column to recipe_tools table
ALTER TABLE public.recipe_tools 
ADD COLUMN IF NOT EXISTS image_url TEXT;