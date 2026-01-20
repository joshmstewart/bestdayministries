-- Fix the notify_on_drink_like trigger function to use correct column name
CREATE OR REPLACE FUNCTION public.notify_on_drink_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  drink_owner_id UUID;
  drink_name TEXT;
  liker_name TEXT;
  pref_record RECORD;
BEGIN
  -- Get the drink owner (creator_id, not user_id) and name
  SELECT creator_id, name INTO drink_owner_id, drink_name 
  FROM custom_drinks 
  WHERE id = NEW.drink_id;
  
  -- Don't notify if liking own drink
  IF drink_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  
  -- Check user preferences
  SELECT * INTO pref_record FROM notification_preferences WHERE user_id = drink_owner_id;
  
  IF pref_record IS NULL OR pref_record.inapp_on_content_like IS NULL OR pref_record.inapp_on_content_like = true THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      drink_owner_id,
      'content_like',
      'Someone liked your drink!',
      COALESCE(liker_name, 'Someone') || ' liked your drink "' || COALESCE(drink_name, 'Untitled') || '"',
      '/games/drink-mixer',
      jsonb_build_object('drink_id', NEW.drink_id, 'liker_id', NEW.user_id, 'content_type', 'drink')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;