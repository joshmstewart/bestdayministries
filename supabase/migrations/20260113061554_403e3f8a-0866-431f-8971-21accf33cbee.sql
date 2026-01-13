-- Add audio_url column to beat_pad_sounds for storing AI-generated sound files
ALTER TABLE public.beat_pad_sounds 
ADD COLUMN audio_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.beat_pad_sounds.audio_url IS 'URL to AI-generated audio file stored in Supabase storage';