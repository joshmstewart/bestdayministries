-- Add easy mode tracking to wordle_attempts
ALTER TABLE public.wordle_attempts 
ADD COLUMN is_easy_mode boolean NOT NULL DEFAULT false;

-- Add easy mode preference to profiles (default enabled for besties)
ALTER TABLE public.profiles 
ADD COLUMN wordle_easy_mode_enabled boolean DEFAULT NULL;

-- Comment explaining the logic
COMMENT ON COLUMN public.profiles.wordle_easy_mode_enabled IS 'NULL = use role default (true for bestie, false for others), true/false = explicit preference';