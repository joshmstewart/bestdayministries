CREATE OR REPLACE FUNCTION public.notify_on_sponsor_message_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref_record RECORD;
BEGIN
  IF NEW.sent_by IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending_approval' AND NEW.status IN ('approved', 'rejected') THEN
    SELECT * INTO pref_record FROM notification_preferences WHERE user_id = NEW.sent_by;

    IF NEW.status = 'approved' THEN
      IF pref_record IS NULL OR pref_record.inapp_on_message_approved IS NULL OR pref_record.inapp_on_message_approved = true THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          NEW.sent_by,
          'message_approved',
          'Your message was approved!',
          'Your message "' || COALESCE(NEW.subject, 'No subject') || '" has been approved and sent to sponsors.',
          '/bestie-messages',
          jsonb_build_object('message_id', NEW.id)
        );
      END IF;
    ELSIF NEW.status = 'rejected' THEN
      IF pref_record IS NULL OR pref_record.inapp_on_message_rejected IS NULL OR pref_record.inapp_on_message_rejected = true THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
          NEW.sent_by,
          'message_rejected',
          'Your message needs changes',
          'Your message "' || COALESCE(NEW.subject, 'No subject') || '" was not approved.',
          '/bestie-messages',
          jsonb_build_object('message_id', NEW.id, 'rejection_reason', NEW.rejection_reason)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;