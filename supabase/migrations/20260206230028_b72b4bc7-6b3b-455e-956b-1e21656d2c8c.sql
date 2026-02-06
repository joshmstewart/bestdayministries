
ALTER TABLE public.avatar_emotion_images ADD COLUMN IF NOT EXISTS crop_x double precision DEFAULT 0;
ALTER TABLE public.avatar_emotion_images ADD COLUMN IF NOT EXISTS crop_y double precision DEFAULT 0;
