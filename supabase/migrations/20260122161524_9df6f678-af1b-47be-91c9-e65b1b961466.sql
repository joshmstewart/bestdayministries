-- Drop the existing trigger with its actual name
DROP TRIGGER IF EXISTS on_event_created ON events;
DROP TRIGGER IF EXISTS notify_on_new_event_trigger ON events;

-- Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS public.notify_on_new_event() CASCADE;

-- Create function to notify users about new events
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
  -- Only notify for public and active events
  IF NEW.is_public = false OR NEW.is_active = false THEN
    RETURN NEW;
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
    
    -- Queue email notification if enabled
    IF should_notify_email AND user_record.email IS NOT NULL THEN
      INSERT INTO event_email_queue (user_id, user_email, event_id, event_title, event_date, event_location, created_at)
      VALUES (user_record.id, user_record.email, NEW.id, event_title, NEW.event_date, event_location, now());
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create email queue table for async processing
CREATE TABLE IF NOT EXISTS public.event_email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  event_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_email_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage the queue
CREATE POLICY "Admins can manage event email queue"
ON public.event_email_queue
FOR ALL
USING (public.is_admin_or_owner());

-- Create the trigger
CREATE TRIGGER on_event_created
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_event();