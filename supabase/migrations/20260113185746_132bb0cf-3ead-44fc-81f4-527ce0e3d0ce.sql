-- Add description column to custom_drinks table
ALTER TABLE public.custom_drinks ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_drinks_description ON public.custom_drinks (id) WHERE description IS NULL;