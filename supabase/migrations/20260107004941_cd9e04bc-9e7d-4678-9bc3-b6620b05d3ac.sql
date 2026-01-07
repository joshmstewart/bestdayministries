-- Add generation_prompt field to coloring_books table
-- This stores the theme/context to be combined with individual page titles when generating images
ALTER TABLE public.coloring_books 
ADD COLUMN IF NOT EXISTS generation_prompt TEXT;