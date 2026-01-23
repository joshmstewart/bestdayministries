-- Fix the notify_joke_like trigger to use 'question' instead of 'setup'
CREATE OR REPLACE FUNCTION public.notify_joke_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_joke_author_id uuid;
  v_liker_name text;
  v_joke_question text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the joke author from saved_jokes
  SELECT user_id, question INTO v_joke_author_id, v_joke_question
  FROM saved_jokes
  WHERE id = NEW.joke_id;
  
  -- Don't notify if liking own content
  IF v_joke_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_joke_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_joke_author_id,
      'content_like',
      'Someone liked your joke! 😂',
      v_liker_name || ' liked your joke',
      '/games/joke-machine'
    );
  END IF;
  
  -- Queue email notification
  PERFORM queue_content_like_email(
    v_joke_author_id,
    NEW.user_id,
    'joke',
    LEFT(v_joke_question, 50),
    '/games/joke-machine'
  );
  
  RETURN NEW;
END;
$$;