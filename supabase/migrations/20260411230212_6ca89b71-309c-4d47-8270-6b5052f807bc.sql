
CREATE OR REPLACE FUNCTION public.notify_on_new_sponsorship()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bestie_record RECORD;
  guardian_record RECORD;
  sponsor_name TEXT;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  SELECT display_name INTO sponsor_name
  FROM profiles
  WHERE id = NEW.sponsor_id;
  
  SELECT sb.bestie_id, sb.bestie_name INTO bestie_record
  FROM sponsor_besties sb
  WHERE sb.id = NEW.sponsor_bestie_id;
  
  IF bestie_record.bestie_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(inapp_on_new_sponsorship, true), COALESCE(email_on_new_sponsorship, true)
  INTO should_notify_inapp, should_notify_email
  FROM notification_preferences
  WHERE user_id = bestie_record.bestie_id;
  
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
        'amount', NEW.amount
      )
    );
  END IF;
  
  IF should_notify_email THEN
    INSERT INTO sponsorship_email_queue (user_id, user_email, notification_type, bestie_name, sponsor_name, amount, tier_name)
    SELECT bestie_record.bestie_id, p.email, 'new_sponsorship', bestie_record.bestie_name, sponsor_name, NEW.amount, NULL
    FROM profiles p
    WHERE p.id = bestie_record.bestie_id AND p.email IS NOT NULL;
  END IF;
  
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
          'amount', NEW.amount
        )
      );
    END IF;
    
    IF should_notify_email THEN
      INSERT INTO sponsorship_email_queue (user_id, user_email, notification_type, bestie_name, sponsor_name, amount, tier_name)
      SELECT guardian_record.caregiver_id, p.email, 'new_sponsorship', bestie_record.bestie_name, sponsor_name, NEW.amount, NULL
      FROM profiles p
      WHERE p.id = guardian_record.caregiver_id AND p.email IS NOT NULL;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_sponsorship_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bestie_record RECORD;
  guardian_record RECORD;
  sponsor_name TEXT;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  change_desc TEXT;
BEGIN
  IF NEW.status != 'active' OR OLD.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  IF OLD.amount = NEW.amount THEN
    RETURN NEW;
  END IF;
  
  change_desc := 'Sponsorship amount changed from $' || OLD.amount || ' to $' || NEW.amount;
  
  SELECT display_name INTO sponsor_name
  FROM profiles
  WHERE id = NEW.sponsor_id;
  
  SELECT sb.bestie_id, sb.bestie_name INTO bestie_record
  FROM sponsor_besties sb
  WHERE sb.id = NEW.sponsor_bestie_id;
  
  IF bestie_record.bestie_id IS NULL THEN
    RETURN NEW;
  END IF;
  
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
        'new_amount', NEW.amount
      )
    );
  END IF;
  
  IF should_notify_email THEN
    INSERT INTO sponsorship_email_queue (user_id, user_email, notification_type, bestie_name, sponsor_name, amount, tier_name, old_amount, old_tier_name)
    SELECT bestie_record.bestie_id, p.email, 'sponsorship_update', bestie_record.bestie_name, sponsor_name, NEW.amount, NULL, OLD.amount, NULL
    FROM profiles p
    WHERE p.id = bestie_record.bestie_id AND p.email IS NOT NULL;
  END IF;
  
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
      SELECT guardian_record.caregiver_id, p.email, 'sponsorship_update', bestie_record.bestie_name, sponsor_name, NEW.amount, NULL, OLD.amount, NULL
      FROM profiles p
      WHERE p.id = guardian_record.caregiver_id AND p.email IS NOT NULL;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;
