-- Fix the update_beat_pad_likes_count function to run as SECURITY DEFINER
-- This allows the trigger to update likes_count even when the user liking isn't the creator

CREATE OR REPLACE FUNCTION update_beat_pad_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.beat_pad_creations SET likes_count = likes_count + 1 WHERE id = NEW.creation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.beat_pad_creations SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.creation_id;
  END IF;
  RETURN NULL;
END;
$$;