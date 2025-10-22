-- Create function to notify sponsors of new messages
CREATE OR REPLACE FUNCTION notify_sponsors_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sponsor_record RECORD;
  bestie_name TEXT;
  message_subject TEXT;
BEGIN
  -- Only process approved or sent messages
  IF NEW.status NOT IN ('approved', 'sent') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if this is an update and status hasn't changed to approved/sent
  IF TG_OP = 'UPDATE' AND OLD.status IN ('approved', 'sent') THEN
    RETURN NEW;
  END IF;
  
  -- Get bestie name
  SELECT display_name INTO bestie_name
  FROM profiles
  WHERE id = NEW.bestie_id;
  
  message_subject := NEW.subject;
  
  -- Notify all sponsors of this bestie
  FOR sponsor_record IN
    SELECT DISTINCT s.sponsor_id
    FROM sponsorships s
    WHERE s.bestie_id = NEW.bestie_id
      AND s.status = 'active'
      AND s.sponsor_id IS NOT NULL
  LOOP
    -- Create in-app notification
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      sponsor_record.sponsor_id,
      'new_sponsor_message',
      'New message from ' || COALESCE(bestie_name, 'your bestie'),
      message_subject,
      '/guardian-links',
      jsonb_build_object(
        'message_id', NEW.id,
        'bestie_id', NEW.bestie_id,
        'subject', message_subject
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_sponsor_message_approved ON sponsor_messages;
CREATE TRIGGER on_sponsor_message_approved
  AFTER INSERT OR UPDATE ON sponsor_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_sponsors_on_message();