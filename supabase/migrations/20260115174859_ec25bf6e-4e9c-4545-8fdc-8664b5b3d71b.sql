-- Fix the comment notification trigger to use correct preference fields
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Notify post author if they didn't comment on their own post
  IF post_author_id IS NOT NULL AND post_author_id != commenter_id THEN
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
  
  -- Notify other commenters on the same post
  FOR other_commenter IN
    SELECT DISTINCT dc.author_id
    FROM discussion_comments dc
    WHERE dc.post_id = NEW.post_id
      AND dc.author_id != commenter_id
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
$$;

-- Create function for event notifications (new event)
CREATE OR REPLACE FUNCTION public.notify_on_new_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  should_notify BOOLEAN;
  event_title TEXT;
  event_date TEXT;
  event_location TEXT;
BEGIN
  event_title := NEW.title;
  event_date := to_char(NEW.event_date, 'Month DD, YYYY at HH12:MI AM');
  event_location := NEW.location;
  
  -- Only notify for public/active events
  IF NEW.is_public = true AND NEW.is_active = true THEN
    -- Notify all users who have enabled event notifications
    FOR user_record IN
      SELECT p.id, p.display_name
      FROM profiles p
      WHERE p.id != NEW.created_by
    LOOP
      -- Check in-app notification preference
      SELECT COALESCE(inapp_on_new_event, true) INTO should_notify
      FROM notification_preferences 
      WHERE user_id = user_record.id;
      
      should_notify := COALESCE(should_notify, true);
      
      IF should_notify THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          user_record.id,
          'new_event',
          'New Event: ' || event_title,
          'A new event has been scheduled: ' || event_title || ' on ' || event_date,
          '/events?eventId=' || NEW.id,
          jsonb_build_object(
            'event_id', NEW.id,
            'event_title', event_title,
            'event_date', event_date,
            'event_location', event_location
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new events
DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_event();

-- Create function for event update notifications
CREATE OR REPLACE FUNCTION public.notify_on_event_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendee_record RECORD;
  should_notify BOOLEAN;
  event_title TEXT;
  changes TEXT;
BEGIN
  event_title := NEW.title;
  changes := '';
  
  -- Check what changed
  IF OLD.event_date != NEW.event_date THEN
    changes := 'Date/time changed to ' || to_char(NEW.event_date, 'Month DD, YYYY at HH12:MI AM');
  ELSIF OLD.location != NEW.location THEN
    changes := 'Location updated to ' || COALESCE(NEW.location, 'TBD');
  ELSIF OLD.title != NEW.title THEN
    changes := 'Event name changed to ' || NEW.title;
  ELSIF OLD.description != NEW.description THEN
    changes := 'Event description has been updated';
  END IF;
  
  -- Only notify if there are meaningful changes
  IF changes != '' AND NEW.is_active = true THEN
    -- Notify event attendees
    FOR attendee_record IN
      SELECT DISTINCT ea.user_id
      FROM event_attendees ea
      WHERE ea.event_id = NEW.id
        AND ea.user_id != NEW.created_by
    LOOP
      -- Check in-app notification preference
      SELECT COALESCE(inapp_on_event_update, true) INTO should_notify
      FROM notification_preferences 
      WHERE user_id = attendee_record.user_id;
      
      should_notify := COALESCE(should_notify, true);
      
      IF should_notify THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          attendee_record.user_id,
          'event_update',
          'Event Update: ' || event_title,
          changes,
          '/events?eventId=' || NEW.id,
          jsonb_build_object(
            'event_id', NEW.id,
            'event_title', event_title,
            'changes', changes
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for event updates
DROP TRIGGER IF EXISTS on_event_updated ON events;
CREATE TRIGGER on_event_updated
  AFTER UPDATE ON events
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION notify_on_event_update();