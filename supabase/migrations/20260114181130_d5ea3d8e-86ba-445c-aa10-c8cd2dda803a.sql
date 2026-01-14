-- Add is_reviewed column to joke_library table
ALTER TABLE public.joke_library ADD COLUMN IF NOT EXISTS is_reviewed boolean NOT NULL DEFAULT false;