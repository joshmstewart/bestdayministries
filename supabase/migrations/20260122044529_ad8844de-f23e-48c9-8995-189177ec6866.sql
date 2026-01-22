-- Create trigger for prayer request likes
CREATE OR REPLACE FUNCTION public.notify_on_prayer_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prayer_owner_id UUID;
  prayer_preview TEXT;
  liker_name TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the prayer request owner and preview
  SELECT user_id, LEFT(content, 50) INTO prayer_owner_id, prayer_preview
  FROM prayer_requests WHERE id = NEW.prayer_request_id;

  -- Don't notify if user liked their own content or if prayer not found
  IF prayer_owner_id IS NULL OR prayer_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = prayer_owner_id;

  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      prayer_owner_id,
      'content_like',
      'Someone prayed for you!',
      liker_name || ' prayed for: "' || prayer_preview || '..."',
      '/community?tab=prayers',
      jsonb_build_object('prayer_request_id', NEW.prayer_request_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger for prayer_request_likes
DROP TRIGGER IF EXISTS on_prayer_like ON prayer_request_likes;
CREATE TRIGGER on_prayer_like
AFTER INSERT ON prayer_request_likes
FOR EACH ROW
EXECUTE FUNCTION notify_on_prayer_like();

-- Create trigger for workout image likes
CREATE OR REPLACE FUNCTION public.notify_on_workout_image_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  image_owner_id UUID;
  image_title TEXT;
  liker_name TEXT;
  pref_inapp BOOLEAN;
BEGIN
  -- Get the workout image owner
  SELECT user_id, COALESCE(title, 'your workout image') INTO image_owner_id, image_title
  FROM workout_images WHERE id = NEW.image_id;

  -- Don't notify if user liked their own content or if image not found
  IF image_owner_id IS NULL OR image_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check user preference for in-app notifications
  SELECT COALESCE(inapp_on_content_like, true) INTO pref_inapp
  FROM notification_preferences WHERE user_id = image_owner_id;

  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  IF pref_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      image_owner_id,
      'content_like',
      'Someone liked your workout image!',
      liker_name || ' liked ' || image_title,
      '/games/fitness-tracker',
      jsonb_build_object('image_id', NEW.image_id, 'liker_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger for workout_image_likes
DROP TRIGGER IF EXISTS on_workout_image_like ON workout_image_likes;
CREATE TRIGGER on_workout_image_like
AFTER INSERT ON workout_image_likes
FOR EACH ROW
EXECUTE FUNCTION notify_on_workout_image_like();