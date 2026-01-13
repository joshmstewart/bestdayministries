-- Add image_url column to beat_pad_creations
ALTER TABLE public.beat_pad_creations 
ADD COLUMN IF NOT EXISTS image_url TEXT;