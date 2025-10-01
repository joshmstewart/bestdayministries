-- Add text-to-speech enabled setting to profiles table
ALTER TABLE public.profiles 
ADD COLUMN tts_enabled boolean NOT NULL DEFAULT true;