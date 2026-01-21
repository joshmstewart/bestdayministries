-- Fix the notify_on_joke_like function to query saved_jokes instead of joke_library
CREATE OR REPLACE FUNCTION public.notify_on_joke_like()
RETURNS TRIGGER AS $$
DECLARE
  joke_owner_id UUID;
  liker_name TEXT;
  joke_preview TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the joke owner from saved_jokes (not joke_library)
  SELECT user_id, LEFT(question, 30) INTO joke_owner_id, joke_preview
  FROM saved_jokes
  WHERE id = NEW.joke_id;

  -- Don't notify if user liked their own content or if joke not found
  IF joke_owner_id IS NULL OR joke_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = joke_owner_id;

  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      joke_owner_id,
      'content_like',
      'New like on your joke!',
      liker_name || ' liked your joke: "' || joke_preview || '..."',
      '/games/joke-generator',
      jsonb_build_object('joke_id', NEW.joke_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;