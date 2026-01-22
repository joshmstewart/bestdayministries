-- Fix workout like notifications trigger referencing a non-existent table
-- The likes table uses NEW.image_id and images live in workout_generated_images

CREATE OR REPLACE FUNCTION public.notify_on_workout_image_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_image_author_id uuid;
  v_liker_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the workout image author (correct table + column)
  SELECT user_id INTO v_image_author_id
  FROM public.workout_generated_images
  WHERE id = NEW.image_id;

  -- If image not found, do nothing
  IF v_image_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if liking own content
  IF v_image_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM public.notification_preferences
  WHERE user_id = v_image_author_id;

  IF v_inapp_enabled THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      v_image_author_id,
      'content_like',
      'Someone liked your workout! 💪',
      COALESCE(v_liker_name, 'Someone') || ' liked your fitness image',
      '/games/fitness-tracker'
    );
  END IF;

  -- Queue email notification
  PERFORM public.queue_content_like_email(
    v_image_author_id,
    NEW.user_id,
    'workout image',
    'Fitness Image',
    '/games/fitness-tracker'
  );

  RETURN NEW;
END;
$function$;