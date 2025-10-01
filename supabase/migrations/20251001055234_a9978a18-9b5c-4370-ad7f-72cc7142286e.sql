-- Add audio_url and expires_after_date columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS expires_after_date BOOLEAN NOT NULL DEFAULT true;