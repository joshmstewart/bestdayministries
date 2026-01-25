-- Remove ALL creator/self exclusions from notification functions
-- This is a handmade platform where creators need to see all activity to confirm it's working

-- 1. Update notify_on_content_announcement - INCLUDE creator
CREATE OR REPLACE FUNCTION public.notify_on_content_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  should_notify_inapp BOOLEAN;
BEGIN
  -- Only notify when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Notify ALL users including creator
    FOR user_record IN
      SELECT p.id
      FROM profiles p
    LOOP
      -- Check in-app notification preference
      SELECT COALESCE(np.inapp_on_new_content_announcement, true) INTO should_notify_inapp
      FROM notification_preferences np
      WHERE np.user_id = user_record.id;
      
      -- Default to true if no preference record exists
      should_notify_inapp := COALESCE(should_notify_inapp, true);
      
      IF should_notify_inapp THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          user_record.id,
          'content_announcement',
          '🎉 ' || NEW.title,
          COALESCE(NEW.description, 'Check out our latest content!'),
          COALESCE(NEW.link_url, '/community'),
          jsonb_build_object(
            'announcement_id', NEW.id,
            'announcement_type', NEW.announcement_type
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Update notify_on_new_event - INCLUDE creator
CREATE OR REPLACE FUNCTION public.notify_on_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  event_title TEXT;
  event_date_formatted TEXT;
  event_location TEXT;
BEGIN
  -- Only notify for published, public, and active events
  IF NEW.status != 'published' OR NEW.is_public = false OR NEW.is_active = false THEN
    RETURN NEW;
  END IF;
  
  -- Skip if this is an update from draft to published (handled separately)
  IF TG_OP = 'INSERT' THEN
    -- Continue with notification
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify if transitioning from draft to published
    IF OLD.status = 'draft' AND NEW.status = 'published' THEN
      -- Continue with notification
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  event_title := NEW.title;
  event_date_formatted := to_char(NEW.event_date, 'Month DD, YYYY at HH12:MI AM');
  event_location := COALESCE(NEW.location, 'Location TBD');
  
  -- Notify ALL users INCLUDING the creator
  FOR user_record IN
    SELECT p.id, p.email, p.display_name
    FROM profiles p
  LOOP
    -- Get notification preferences (default to true if not set)
    SELECT 
      COALESCE(np.inapp_on_new_event, true),
      COALESCE(np.email_on_new_event, false)
    INTO should_notify_inapp, should_notify_email
    FROM notification_preferences np
    WHERE np.user_id = user_record.id;
    
    -- If no preferences record exists, use defaults
    IF NOT FOUND THEN
      should_notify_inapp := true;
      should_notify_email := false;
    END IF;
    
    -- Create in-app notification if enabled
    IF should_notify_inapp THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        user_record.id,
        'new_event',
        'New Event: ' || event_title,
        'A new event has been posted: ' || event_title || ' on ' || event_date_formatted,
        '/community?eventId=' || NEW.id,
        jsonb_build_object(
          'event_id', NEW.id,
          'event_title', event_title,
          'event_date', NEW.event_date,
          'event_location', event_location
        )
      );
    END IF;
    
    -- Queue email notification if enabled (now includes image)
    IF should_notify_email AND user_record.email IS NOT NULL THEN
      INSERT INTO event_email_queue (user_id, user_email, event_id, event_title, event_date, event_location, event_image_url, created_at)
      VALUES (user_record.id, user_record.email, NEW.id, event_title, NEW.event_date, event_location, NEW.image_url, now());
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 3. Update notify_on_event_update - INCLUDE creator
CREATE OR REPLACE FUNCTION public.notify_on_event_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attendee_record RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  event_title TEXT;
  changes TEXT;
BEGIN
  event_title := NEW.title;
  changes := '';
  
  -- Check what changed
  IF OLD.event_date != NEW.event_date THEN
    changes := 'Date/time changed to ' || to_char(NEW.event_date, 'Month DD, YYYY at HH12:MI AM');
  ELSIF OLD.location IS DISTINCT FROM NEW.location THEN
    changes := 'Location updated to ' || COALESCE(NEW.location, 'TBD');
  ELSIF OLD.title != NEW.title THEN
    changes := 'Event name changed to ' || NEW.title;
  ELSIF OLD.description IS DISTINCT FROM NEW.description THEN
    changes := 'Event description has been updated';
  END IF;
  
  -- Only notify if there are meaningful changes and event is active
  IF changes != '' AND NEW.is_active = true THEN
    -- Notify ALL event attendees INCLUDING the creator
    FOR attendee_record IN
      SELECT DISTINCT ea.user_id
      FROM event_attendees ea
      WHERE ea.event_id = NEW.id
    LOOP
      -- Check in-app notification preference
      SELECT COALESCE(inapp_on_event_update, true), COALESCE(email_on_event_update, true)
      INTO should_notify_inapp, should_notify_email
      FROM notification_preferences 
      WHERE user_id = attendee_record.user_id;
      
      -- Default to true if no preference record exists
      should_notify_inapp := COALESCE(should_notify_inapp, true);
      should_notify_email := COALESCE(should_notify_email, true);
      
      IF should_notify_inapp THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          attendee_record.user_id,
          'event_update',
          '📅 Event Updated: ' || event_title,
          changes,
          '/community',
          jsonb_build_object(
            'event_id', NEW.id,
            'change_type', 'update'
          )
        );
      END IF;
      
      IF should_notify_email THEN
        INSERT INTO event_update_email_queue (user_id, user_email, event_id, event_title, change_description, event_date, event_location)
        SELECT attendee_record.user_id, p.email, NEW.id, event_title, changes, NEW.event_date, NEW.location
        FROM profiles p
        WHERE p.id = attendee_record.user_id AND p.email IS NOT NULL;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Update notify_on_new_comment - INCLUDE commenter in their own notifications
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  commenter_name TEXT;
  commenter_id UUID;
  other_commenter RECORD;
  should_notify BOOLEAN;
BEGIN
  -- Get the commenter's ID and name
  commenter_id := NEW.author_id;
  SELECT display_name INTO commenter_name
  FROM profiles
  WHERE id = commenter_id;
  
  -- Get the post author and title
  SELECT author_id, title INTO post_author_id, post_title
  FROM discussion_posts
  WHERE id = NEW.post_id;
  
  -- Notify post author INCLUDING if they commented on their own post
  IF post_author_id IS NOT NULL THEN
    -- Check in-app notification preference for comments on posts
    SELECT COALESCE(inapp_on_comment_on_post, true) INTO should_notify
    FROM notification_preferences 
    WHERE user_id = post_author_id;
    
    -- Default to true if no preference record exists
    should_notify := COALESCE(should_notify, true);
    
    IF should_notify THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        post_author_id,
        'comment_on_post',
        'New comment on your post',
        commenter_name || ' commented on "' || post_title || '"',
        '/discussions?postId=' || NEW.post_id,
        jsonb_build_object(
          'post_id', NEW.post_id,
          'comment_id', NEW.id,
          'commenter_id', commenter_id
        )
      );
    END IF;
  END IF;
  
  -- Notify ALL other commenters on the same post (still exclude the post author to avoid duplicate)
  FOR other_commenter IN
    SELECT DISTINCT dc.author_id
    FROM discussion_comments dc
    WHERE dc.post_id = NEW.post_id
      AND dc.author_id != post_author_id
      AND dc.id != NEW.id
  LOOP
    -- Check in-app notification preference for comments on threads
    SELECT COALESCE(inapp_on_comment_on_thread, true) INTO should_notify
    FROM notification_preferences 
    WHERE user_id = other_commenter.author_id;
    
    -- Default to true if no preference record exists
    should_notify := COALESCE(should_notify, true);
    
    IF should_notify THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        other_commenter.author_id,
        'comment_on_thread',
        'New comment on a discussion',
        commenter_name || ' also commented on "' || post_title || '"',
        '/discussions?postId=' || NEW.post_id,
        jsonb_build_object(
          'post_id', NEW.post_id,
          'comment_id', NEW.id,
          'commenter_id', commenter_id
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 5. Update notify_on_beat_pad_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_beat_pad_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_beat_author_id uuid;
  v_liker_name text;
  v_beat_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the beat author
  SELECT creator_id, name INTO v_beat_author_id, v_beat_name
  FROM beat_pad_creations
  WHERE id = NEW.creation_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_beat_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_beat_author_id,
      'content_like',
      'Someone liked your beat! 🎵',
      v_liker_name || ' liked your beat "' || COALESCE(v_beat_name, 'Untitled') || '"',
      '/games/beat-pad'
    );
  END IF;
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_beat_author_id,
    NEW.user_id,
    'beat',
    v_beat_name,
    '/games/beat-pad'
  );
  
  RETURN NEW;
END;
$function$;

-- 6. Update notify_on_card_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_card_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card_author_id uuid;
  v_liker_name text;
  v_card_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the card author
  SELECT user_id, title INTO v_card_author_id, v_card_title
  FROM user_cards
  WHERE id = NEW.card_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_card_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_card_author_id,
      'content_like',
      'Someone liked your card! 🎨',
      v_liker_name || ' liked your card "' || COALESCE(v_card_title, 'Untitled') || '"',
      '/games/card-maker'
    );
  END IF;
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_card_author_id,
    NEW.user_id,
    'card',
    v_card_title,
    '/games/card-maker'
  );
  
  RETURN NEW;
END;
$function$;

-- 7. Update notify_on_challenge_gallery_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_challenge_gallery_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_gallery_author_id uuid;
  v_liker_name text;
  v_gallery_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the gallery item author
  SELECT user_id, title INTO v_gallery_author_id, v_gallery_title
  FROM chore_challenge_gallery
  WHERE id = NEW.gallery_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_gallery_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_gallery_author_id,
      'content_like',
      'Someone liked your challenge art! ⭐',
      v_liker_name || ' liked your challenge completion',
      '/games/daily-challenge'
    );
  END IF;
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_gallery_author_id,
    NEW.user_id,
    'challenge art',
    v_gallery_title,
    '/games/daily-challenge'
  );
  
  RETURN NEW;
END;
$function$;

-- 8. Update notify_on_coloring_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_coloring_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_coloring_author_id uuid;
  v_liker_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the coloring author
  SELECT user_id INTO v_coloring_author_id
  FROM user_colorings
  WHERE id = NEW.coloring_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_coloring_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_coloring_author_id,
      'content_like',
      'Someone liked your coloring! 🖍️',
      v_liker_name || ' liked your coloring page',
      '/games/coloring'
    );
  END IF;
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_coloring_author_id,
    NEW.user_id,
    'coloring',
    'Coloring Page',
    '/games/coloring'
  );
  
  RETURN NEW;
END;
$function$;

-- 9. Update notify_on_drink_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_drink_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_drink_author_id uuid;
  v_liker_name text;
  v_drink_name text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the drink author
  SELECT creator_id, name INTO v_drink_author_id, v_drink_name
  FROM custom_drinks
  WHERE id = NEW.drink_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_drink_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_drink_author_id,
      'content_like',
      'Someone liked your drink! 🥤',
      v_liker_name || ' liked your drink "' || COALESCE(v_drink_name, 'Untitled') || '"',
      '/games/drink-mixer'
    );
  END IF;
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_drink_author_id,
    NEW.user_id,
    'drink',
    v_drink_name,
    '/games/drink-mixer'
  );
  
  RETURN NEW;
END;
$function$;

-- 10. Update notify_on_joke_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_joke_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_joke_author_id uuid;
  v_liker_name text;
  v_joke_question text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the joke author
  SELECT user_id, question INTO v_joke_author_id, v_joke_question
  FROM saved_jokes
  WHERE id = NEW.joke_id;
  
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
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_joke_author_id,
    NEW.user_id,
    'joke',
    LEFT(v_joke_question, 50),
    '/games/joke-machine'
  );
  
  RETURN NEW;
END;
$function$;

-- 11. Update notify_on_prayer_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_prayer_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prayer_author_id uuid;
  v_liker_name text;
  v_prayer_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the prayer request author
  SELECT user_id, title INTO v_prayer_author_id, v_prayer_title
  FROM prayer_requests
  WHERE id = NEW.prayer_request_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_prayer_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_prayer_author_id,
      'content_like',
      'Someone prayed with you! 🙏',
      v_liker_name || ' prayed for your request',
      '/games/prayer-partner'
    );
  END IF;
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_prayer_author_id,
    NEW.user_id,
    'prayer request',
    v_prayer_title,
    '/games/prayer-partner'
  );
  
  RETURN NEW;
END;
$function$;

-- 12. Update notify_on_recipe_like - INCLUDE self-likes
CREATE OR REPLACE FUNCTION public.notify_on_recipe_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recipe_author_id uuid;
  v_liker_name text;
  v_recipe_title text;
  v_inapp_enabled boolean;
BEGIN
  -- Get the recipe author
  SELECT creator_id, title INTO v_recipe_author_id, v_recipe_title
  FROM public_recipes
  WHERE id = NEW.recipe_id;
  
  -- Get liker's name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_content_like, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = v_recipe_author_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_recipe_author_id,
      'content_like',
      'Someone liked your recipe! 🍳',
      v_liker_name || ' liked your recipe "' || COALESCE(v_recipe_title, 'Untitled') || '"',
      '/games/recipe-gallery?tab=community'
    );
  END IF;
  
  -- Queue email notification - include all likes
  PERFORM queue_content_like_email(
    v_recipe_author_id,
    NEW.user_id,
    'recipe',
    v_recipe_title,
    '/games/recipe-gallery?tab=community'
  );
  
  RETURN NEW;
END;
$function$;

-- 13. Update notify_on_workout_image_like - INCLUDE self-likes
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
  -- Get the workout image author
  SELECT user_id INTO v_image_author_id
  FROM public.workout_generated_images
  WHERE id = NEW.image_id;

  -- If image not found, do nothing
  IF v_image_author_id IS NULL THEN
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

  -- Queue email notification - include all likes
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