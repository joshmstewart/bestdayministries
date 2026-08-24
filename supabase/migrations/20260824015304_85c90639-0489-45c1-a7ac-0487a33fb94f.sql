-- 1) Broken notification function: sponsorships has no user_id column,
--    so every approval of a sponsor message raised 42703 and rolled back.
CREATE OR REPLACE FUNCTION public.notify_on_sponsor_message_sent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sponsor_record RECORD;
  sender_name TEXT;
  bestie_name TEXT;
  pref_record RECORD;
  sponsor_user_id UUID;
BEGIN
  IF NEW.status = 'sent' OR (NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved')) THEN
    SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sent_by;
    SELECT display_name INTO bestie_name FROM profiles WHERE id = NEW.bestie_id;

    FOR sponsor_record IN
      SELECT DISTINCT s.sponsor_id AS the_user_id
      FROM sponsorships s
      WHERE s.bestie_id = NEW.bestie_id
        AND s.status = 'active'
        AND s.sponsor_id IS NOT NULL
    LOOP
      sponsor_user_id := sponsor_record.the_user_id;

      IF sponsor_user_id IS NOT NULL THEN
        SELECT * INTO pref_record FROM notification_preferences WHERE user_id = sponsor_user_id;

        IF pref_record IS NULL OR pref_record.inapp_on_new_sponsor_message IS NULL OR pref_record.inapp_on_new_sponsor_message = true THEN
          INSERT INTO notifications (user_id, type, title, message, link, metadata)
          VALUES (
            sponsor_user_id,
            'new_sponsor_message',
            'New message from ' || COALESCE(sender_name, 'your bestie'),
            COALESCE(bestie_name, 'Your bestie') || ' sent you a message: ' || COALESCE(NEW.subject, 'No subject'),
            '/guardian-links',
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
$function$;

-- 2) Duplicate notifier (ignores notification preferences) — remove the trigger.
DROP TRIGGER IF EXISTS on_sponsor_message_approved ON public.sponsor_messages;

-- 3) Approval integrity: besties must not be able to self-approve, and
--    sponsors must not be able to rewrite a message they received.
CREATE OR REPLACE FUNCTION public.enforce_sponsor_message_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  privileged boolean;
  needs_approval boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  privileged := has_admin_access(auth.uid()) OR is_guardian_of(auth.uid(), NEW.bestie_id);

  IF privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.status := OLD.status;
    NEW.subject := OLD.subject;
    NEW.message := OLD.message;
    NEW.audio_url := OLD.audio_url;
    NEW.image_url := OLD.image_url;
    NEW.video_url := OLD.video_url;
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
    NEW.rejection_reason := OLD.rejection_reason;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_bestie_links l
    WHERE l.bestie_id = NEW.bestie_id
      AND l.require_message_approval
  ) INTO needs_approval;

  IF needs_approval THEN
    NEW.status := 'pending_approval';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_sponsor_message_integrity ON public.sponsor_messages;
CREATE TRIGGER enforce_sponsor_message_integrity
BEFORE INSERT OR UPDATE ON public.sponsor_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_message_integrity();