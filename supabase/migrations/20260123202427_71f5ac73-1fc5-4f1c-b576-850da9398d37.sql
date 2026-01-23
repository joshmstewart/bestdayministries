-- Add status column to events table for draft support
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' 
CHECK (status IN ('draft', 'published'));

-- Add image_url column to event_email_queue for including images in emails
ALTER TABLE public.event_email_queue 
ADD COLUMN IF NOT EXISTS event_image_url TEXT;

-- Update the trigger function to only notify on published events and include image
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
  
  -- Notify all users except the creator
  FOR user_record IN
    SELECT p.id, p.email, p.display_name
    FROM profiles p
    WHERE p.id != NEW.created_by
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

-- Drop and recreate trigger to also handle updates (draft → published)
DROP TRIGGER IF EXISTS on_event_created ON events;

CREATE TRIGGER on_event_created
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_event();