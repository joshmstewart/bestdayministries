-- Update the trigger function to include link fields in email queue
CREATE OR REPLACE FUNCTION public.queue_event_emails()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
  event_title TEXT;
  event_location TEXT;
  should_notify_email BOOLEAN;
BEGIN
  -- Only process when status changes to 'published' from 'draft' or NULL
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    
    -- Get event details
    event_title := NEW.title;
    event_location := COALESCE(NEW.location_name, NEW.location, 'Location TBD');
    
    -- Loop through all users who want email notifications for events
    FOR user_record IN 
      SELECT DISTINCT p.id, au.email
      FROM profiles p
      JOIN auth.users au ON au.id = p.id
      JOIN notification_preferences np ON np.user_id = p.id
      WHERE np.event_notifications_email = true
        AND au.email IS NOT NULL
    LOOP
      -- Queue email notification
      INSERT INTO event_email_queue (
        user_id, 
        user_email, 
        event_id, 
        event_title, 
        event_date, 
        event_location, 
        event_image_url,
        event_link_url,
        event_link_label,
        created_at
      )
      VALUES (
        user_record.id, 
        user_record.email, 
        NEW.id, 
        event_title, 
        NEW.event_date, 
        event_location, 
        NEW.image_url,
        NEW.link_url,
        COALESCE(NEW.link_label, 'Learn More'),
        now()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;