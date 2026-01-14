-- Add ai_audio_url column to store the AI-generated track
ALTER TABLE public.beat_pad_creations 
ADD COLUMN ai_audio_url TEXT;