-- Fix beat pad like trigger function (ambiguous creator_id variable)
-- This bug caused beat_pad_likes INSERTs to fail, so likes never persisted.

CREATE OR REPLACE FUNCTION public.notify_on_beat_pad_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beat_creator_id UUID;
  liker_name TEXT;
  beat_name TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the beat creator and name
  SELECT c.creator_id, COALESCE(c.name, 'your beat')
  INTO beat_creator_id, beat_name
  FROM public.beat_pad_creations c
  WHERE c.id = NEW.creation_id;

  -- If we can't find the beat, don't block the like.
  IF beat_creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if user liked their own content
  IF beat_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(np.inapp_on_content_like, true)
  INTO pref_inapp
  FROM public.notification_preferences np
  WHERE np.user_id = beat_creator_id;

  -- Get liker's name
  SELECT COALESCE(p.full_name, 'Someone')
  INTO liker_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      beat_creator_id,
      'content_like',
      'New like on your beat!',
      liker_name || ' liked ' || beat_name,
      '/games/beat-pad',
      jsonb_build_object('creation_id', NEW.creation_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;