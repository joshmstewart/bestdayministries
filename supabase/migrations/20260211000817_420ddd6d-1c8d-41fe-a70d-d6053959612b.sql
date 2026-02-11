-- Add thumbnail columns to fitness_avatars for compressed avatar images
ALTER TABLE public.fitness_avatars 
  ADD COLUMN IF NOT EXISTS thumbnail_sm_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_md_url TEXT;