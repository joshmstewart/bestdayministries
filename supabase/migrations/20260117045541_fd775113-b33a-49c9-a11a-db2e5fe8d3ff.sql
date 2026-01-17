-- Add auto_share_workout_images setting to profiles (defaults to true)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_share_workout_images boolean NOT NULL DEFAULT true;