-- Create queue tables for sponsorship and event update emails
CREATE TABLE IF NOT EXISTS public.sponsorship_email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'new_sponsorship' or 'sponsorship_update'
  bestie_name TEXT,
  sponsor_name TEXT,
  amount NUMERIC,
  tier_name TEXT,
  old_amount NUMERIC,
  old_tier_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.event_update_email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  event_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  change_description TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.sponsorship_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_update_email_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access only
CREATE POLICY "Admins can manage sponsorship email queue" ON public.sponsorship_email_queue
  FOR ALL USING (public.is_admin_or_owner());

CREATE POLICY "Admins can manage event update email queue" ON public.event_update_email_queue
  FOR ALL USING (public.is_admin_or_owner());

-- Function to notify bestie and guardian when a new sponsorship is created
CREATE OR REPLACE FUNCTION public.notify_on_new_sponsorship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bestie_record RECORD;
  guardian_record RECORD;
  sponsor_name TEXT;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
BEGIN
  -- Only trigger on active sponsorships
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Get sponsor name
  SELECT display_name INTO sponsor_name
  FROM profiles
  WHERE id = NEW.sponsor_id;
  
  -- Get bestie info from sponsor_besties
  SELECT sb.bestie_id, sb.bestie_name INTO bestie_record
  FROM sponsor_besties sb
  WHERE sb.id = NEW.sponsor_bestie_id;
  
  IF bestie_record.bestie_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Notify the bestie
  SELECT COALESCE(inapp_on_new_sponsorship, true), COALESCE(email_on_new_sponsorship, true)
  INTO should_notify_inapp, should_notify_email
  FROM notification_preferences
  WHERE user_id = bestie_record.bestie_id;
  
  -- Default to true if no preference
  should_notify_inapp := COALESCE(should_notify_inapp, true);
  should_notify_email := COALESCE(should_notify_email, true);
  
  IF should_notify_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      bestie_record.bestie_id,
      'new_sponsorship',
      '🎉 You have a new sponsor!',
      COALESCE(sponsor_name, 'Someone') || ' is now sponsoring you!',
      '/bestie-messages',
      jsonb_build_object(
        'sponsorship_id', NEW.id,
        'sponsor_id', NEW.sponsor_id,
        'amount', NEW.amount,
        'tier_name', NEW.tier_name
      )
    );
  END IF;
  
  IF should_notify_email THEN
    INSERT INTO sponsorship_email_queue (user_id, user_email, notification_type, bestie_name, sponsor_name, amount, tier_name)
    SELECT bestie_record.bestie_id, p.email, 'new_sponsorship', bestie_record.bestie_name, sponsor_name, NEW.amount, NEW.tier_name
    FROM profiles p
    WHERE p.id = bestie_record.bestie_id AND p.email IS NOT NULL;
  END IF;
  
  -- Notify guardians of the bestie
  FOR guardian_record IN
    SELECT cbl.caregiver_id
    FROM caregiver_bestie_links cbl
    WHERE cbl.bestie_id = bestie_record.bestie_id
  LOOP
    SELECT COALESCE(inapp_on_new_sponsorship, true), COALESCE(email_on_new_sponsorship, true)
    INTO should_notify_inapp, should_notify_email
    FROM notification_preferences
    WHERE user_id = guardian_record.caregiver_id;
    
    should_notify_inapp := COALESCE(should_notify_inapp, true);
    should_notify_email := COALESCE(should_notify_email, true);
    
    IF should_notify_inapp THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        guardian_record.caregiver_id,
        'new_sponsorship',
        '🎉 New sponsor for ' || bestie_record.bestie_name,
        COALESCE(sponsor_name, 'Someone') || ' is now sponsoring ' || bestie_record.bestie_name || '!',
        '/guardian-links',
        jsonb_build_object(
          'sponsorship_id', NEW.id,
          'bestie_id', bestie_record.bestie_id,
          'sponsor_id', NEW.sponsor_id,
          'amount', NEW.amount,
          'tier_name', NEW.tier_name
        )
      );
    END IF;
    
    IF should_notify_email THEN
      INSERT INTO sponsorship_email_queue (user_id, user_email, notification_type, bestie_name, sponsor_name, amount, tier_name)
      SELECT guardian_record.caregiver_id, p.email, 'new_sponsorship', bestie_record.bestie_name, sponsor_name, NEW.amount, NEW.tier_name
      FROM profiles p
      WHERE p.id = guardian_record.caregiver_id AND p.email IS NOT NULL;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify on sponsorship updates (tier/amount changes)
CREATE OR REPLACE FUNCTION public.notify_on_sponsorship_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bestie_record RECORD;
  guardian_record RECORD;
  sponsor_name TEXT;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  change_desc TEXT;
BEGIN
  -- Only trigger on meaningful updates to active sponsorships
  IF NEW.status != 'active' OR OLD.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Check if amount or tier changed
  IF OLD.amount = NEW.amount AND OLD.tier_name IS NOT DISTINCT FROM NEW.tier_name THEN
    RETURN NEW;
  END IF;
  
  -- Build change description
  IF OLD.amount != NEW.amount THEN
    change_desc := 'Sponsorship amount changed from $' || OLD.amount || ' to $' || NEW.amount;
  ELSIF OLD.tier_name IS DISTINCT FROM NEW.tier_name THEN
    change_desc := 'Sponsorship tier changed to ' || COALESCE(NEW.tier_name, 'custom');
  END IF;
  
  -- Get sponsor name
  SELECT display_name INTO sponsor_name
  FROM profiles
  WHERE id = NEW.sponsor_id;
  
  -- Get bestie info
  SELECT sb.bestie_id, sb.bestie_name INTO bestie_record
  FROM sponsor_besties sb
  WHERE sb.id = NEW.sponsor_bestie_id;
  
  IF bestie_record.bestie_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Notify the bestie
  SELECT COALESCE(inapp_on_sponsorship_update, true), COALESCE(email_on_sponsorship_update, true)
  INTO should_notify_inapp, should_notify_email
  FROM notification_preferences
  WHERE user_id = bestie_record.bestie_id;
  
  should_notify_inapp := COALESCE(should_notify_inapp, true);
  should_notify_email := COALESCE(should_notify_email, true);
  
  IF should_notify_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      bestie_record.bestie_id,
      'sponsorship_update',
      '📝 Sponsorship Updated',
      change_desc,
      '/bestie-messages',
      jsonb_build_object(
        'sponsorship_id', NEW.id,
        'sponsor_id', NEW.sponsor_id,
        'old_amount', OLD.amount,
        'new_amount', NEW.amount,
        'old_tier', OLD.tier_name,
        'new_tier', NEW.tier_name
      )
    );
  END IF;
  
  IF should_notify_email THEN
    INSERT INTO sponsorship_email_queue (user_id, user_email, notification_type, bestie_name, sponsor_name, amount, tier_name, old_amount, old_tier_name)
    SELECT bestie_record.bestie_id, p.email, 'sponsorship_update', bestie_record.bestie_name, sponsor_name, NEW.amount, NEW.tier_name, OLD.amount, OLD.tier_name
    FROM profiles p
    WHERE p.id = bestie_record.bestie_id AND p.email IS NOT NULL;
  END IF;
  
  -- Notify guardians
  FOR guardian_record IN
    SELECT cbl.caregiver_id
    FROM caregiver_bestie_links cbl
    WHERE cbl.bestie_id = bestie_record.bestie_id
  LOOP
    SELECT COALESCE(inapp_on_sponsorship_update, true), COALESCE(email_on_sponsorship_update, true)
    INTO should_notify_inapp, should_notify_email
    FROM notification_preferences
    WHERE user_id = guardian_record.caregiver_id;
    
    should_notify_inapp := COALESCE(should_notify_inapp, true);
    should_notify_email := COALESCE(should_notify_email, true);
    
    IF should_notify_inapp THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        guardian_record.caregiver_id,
        'sponsorship_update',
        '📝 Sponsorship Updated for ' || bestie_record.bestie_name,
        change_desc,
        '/guardian-links',
        jsonb_build_object(
          'sponsorship_id', NEW.id,
          'bestie_id', bestie_record.bestie_id,
          'sponsor_id', NEW.sponsor_id,
          'old_amount', OLD.amount,
          'new_amount', NEW.amount
        )
      );
    END IF;
    
    IF should_notify_email THEN
      INSERT INTO sponsorship_email_queue (user_id, user_email, notification_type, bestie_name, sponsor_name, amount, tier_name, old_amount, old_tier_name)
      SELECT guardian_record.caregiver_id, p.email, 'sponsorship_update', bestie_record.bestie_name, sponsor_name, NEW.amount, NEW.tier_name, OLD.amount, OLD.tier_name
      FROM profiles p
      WHERE p.id = guardian_record.caregiver_id AND p.email IS NOT NULL;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update notify_on_event_update to also queue emails
CREATE OR REPLACE FUNCTION public.notify_on_event_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Notify event attendees
    FOR attendee_record IN
      SELECT DISTINCT ea.user_id
      FROM event_attendees ea
      WHERE ea.event_id = NEW.id
        AND ea.user_id != NEW.created_by
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
$$;

-- Create triggers
DROP TRIGGER IF EXISTS on_new_sponsorship ON public.sponsorships;
CREATE TRIGGER on_new_sponsorship
  AFTER INSERT ON public.sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_sponsorship();

DROP TRIGGER IF EXISTS on_sponsorship_update ON public.sponsorships;
CREATE TRIGGER on_sponsorship_update
  AFTER UPDATE ON public.sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_sponsorship_update();