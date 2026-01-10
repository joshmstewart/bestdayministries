-- Add extra_rounds_used column to track how many times player has extended
ALTER TABLE public.wordle_attempts 
ADD COLUMN IF NOT EXISTS extra_rounds_used integer NOT NULL DEFAULT 0;