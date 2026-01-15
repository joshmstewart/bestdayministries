-- Fix notify_on_card_like to use display_name instead of full_name
CREATE OR REPLACE FUNCTION public.notify_on_card_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  card_owner_id UUID;
  liker_name TEXT;
  card_title TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the card owner and title
  SELECT user_id, COALESCE(c.custom_text, 'your card') INTO card_owner_id, card_title
  FROM user_cards c
  WHERE c.id = NEW.card_id;

  -- If we can't find the card, don't block the like
  IF card_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if user liked their own content
  IF card_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = card_owner_id;

  -- Get liker's name (FIXED: use display_name, not full_name)
  SELECT COALESCE(display_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      card_owner_id,
      'content_like',
      'New like on your card!',
      liker_name || ' liked ' || card_title,
      '/games/card-creator',
      jsonb_build_object('card_id', NEW.card_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix notify_on_challenge_gallery_like to use display_name instead of full_name
CREATE OR REPLACE FUNCTION public.notify_on_challenge_gallery_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gallery_owner_id UUID;
  liker_name TEXT;
  gallery_title TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the gallery entry owner
  SELECT user_id, COALESCE(title, 'your creation') INTO gallery_owner_id, gallery_title
  FROM chore_challenge_gallery
  WHERE id = NEW.gallery_id;

  -- If we can't find the gallery entry, don't block the like
  IF gallery_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if user liked their own content
  IF gallery_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = gallery_owner_id;

  -- Get liker's name (FIXED: use display_name, not full_name)
  SELECT COALESCE(display_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  -- Create in-app notification if preference allows
  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      gallery_owner_id,
      'content_like',
      'New like on your challenge creation!',
      liker_name || ' liked ' || gallery_title,
      '/games/monthly-challenge',
      jsonb_build_object('gallery_id', NEW.gallery_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix notify_on_joke_like to use display_name instead of full_name
CREATE OR REPLACE FUNCTION public.notify_on_joke_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  joke_owner_id UUID;
  liker_name TEXT;
  joke_preview TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the joke owner
  SELECT creator_id, LEFT(setup, 30) INTO joke_owner_id, joke_preview
  FROM joke_library
  WHERE id = NEW.joke_id;

  -- Don't notify if user liked their own content or if joke not found
  IF joke_owner_id IS NULL OR joke_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = joke_owner_id;

  -- Get liker's name (FIXED: use display_name, not full_name)
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
$$;