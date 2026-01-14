-- Add show_in_selector column to control which categories appear in the game
ALTER TABLE public.joke_categories 
ADD COLUMN IF NOT EXISTS show_in_selector boolean DEFAULT true;

-- Add a comment for clarity
COMMENT ON COLUMN public.joke_categories.show_in_selector IS 'Controls whether this category appears in the joke generator selector. Categories with jokes but not ready for the selector can be hidden here.';