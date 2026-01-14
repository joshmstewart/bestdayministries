-- Add columns to store AI review results
ALTER TABLE public.joke_library 
ADD COLUMN IF NOT EXISTS ai_quality_rating TEXT,
ADD COLUMN IF NOT EXISTS ai_quality_reason TEXT,
ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMP WITH TIME ZONE;