-- Fix sponsor message notification link - sponsors should go to /guardian-links, not /bestie-messages
-- /bestie-messages is for besties to SEND messages
-- Sponsors VIEW messages on /guardian-links page

CREATE OR REPLACE FUNCTION notify_on_sponsor_message_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sponsor_record RECORD;
  sender_name TEXT;
  bestie_name TEXT;
  pref_record RECORD;
  sponsor_user_id UUID;
BEGIN
  -- Only trigger on messages that are being sent (status = 'sent' or just approved)
  IF NEW.status = 'sent' OR (NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved')) THEN
    -- Get sender name
    SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sent_by;
    
    -- Get bestie name
    SELECT display_name INTO bestie_name FROM profiles WHERE id = NEW.bestie_id;
    
    -- Find all active sponsors of this bestie
    FOR sponsor_record IN 
      SELECT DISTINCT COALESCE(s.user_id, s.sponsor_id) as the_user_id
      FROM sponsorships s
      WHERE s.bestie_id = NEW.bestie_id 
        AND s.status = 'active'
        AND (s.user_id IS NOT NULL OR s.sponsor_id IS NOT NULL)
    LOOP
      sponsor_user_id := sponsor_record.the_user_id;
      
      IF sponsor_user_id IS NOT NULL THEN
        -- Check user preferences
        SELECT * INTO pref_record FROM notification_preferences WHERE user_id = sponsor_user_id;
        
        -- Create in-app notification if preference allows (default true if no preference set)
        IF pref_record IS NULL OR pref_record.inapp_on_new_sponsor_message IS NULL OR pref_record.inapp_on_new_sponsor_message = true THEN
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            metadata
          ) VALUES (
            sponsor_user_id,
            'new_sponsor_message',
            'New message from ' || COALESCE(sender_name, 'your bestie'),
            COALESCE(bestie_name, 'Your bestie') || ' sent you a message: ' || COALESCE(NEW.subject, 'No subject'),
            '/guardian-links',  -- FIXED: Sponsors view messages on /guardian-links, not /bestie-messages
            jsonb_build_object(
              'message_id', NEW.id,
              'bestie_id', NEW.bestie_id,
              'sent_by', NEW.sent_by,
              'from_guardian', NEW.from_guardian
            )
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;