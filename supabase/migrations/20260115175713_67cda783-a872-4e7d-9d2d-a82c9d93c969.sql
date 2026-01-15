-- Fix sponsor message notifications to respect user preferences and send emails
-- This trigger handles in-app notifications when sponsor messages are sent/approved

-- First, add preference columns for content likes if they don't exist
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS inapp_on_content_like BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_content_like BOOLEAN DEFAULT false;

-- Create the function to notify sponsors when messages are sent to them
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
BEGIN
  -- Only trigger on messages that are being sent (status = 'sent' or just approved)
  IF NEW.status = 'sent' OR (NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved')) THEN
    -- Get sender name
    SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sent_by;
    
    -- Get bestie name
    SELECT display_name INTO bestie_name FROM profiles WHERE id = NEW.bestie_id;
    
    -- Find all active sponsors of this bestie
    FOR sponsor_record IN 
      SELECT s.sponsor_id, s.user_id
      FROM sponsorships s
      WHERE s.bestie_id = NEW.bestie_id 
        AND s.status = 'active'
        AND (s.user_id IS NOT NULL OR s.sponsor_id IS NOT NULL)
    LOOP
      -- Get the sponsor's user_id
      DECLARE
        sponsor_user_id UUID := COALESCE(sponsor_record.user_id, sponsor_record.sponsor_id);
      BEGIN
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
              '/bestie-messages',
              jsonb_build_object(
                'message_id', NEW.id,
                'bestie_id', NEW.bestie_id,
                'sent_by', NEW.sent_by,
                'from_guardian', NEW.from_guardian
              )
            );
          END IF;
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for sponsor message notifications
DROP TRIGGER IF EXISTS notify_sponsor_message_sent ON sponsor_messages;
CREATE TRIGGER notify_sponsor_message_sent
AFTER INSERT OR UPDATE ON sponsor_messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_sponsor_message_sent();

-- Create function to notify bestie/guardian when their message is approved/rejected
CREATE OR REPLACE FUNCTION notify_on_sponsor_message_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sender_name TEXT;
  pref_record RECORD;
BEGIN
  -- Only handle status changes
  IF OLD.status = 'pending_approval' AND NEW.status IN ('approved', 'rejected') THEN
    -- Get sender info
    SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sent_by;
    
    -- Check preferences
    SELECT * INTO pref_record FROM notification_preferences WHERE user_id = NEW.sent_by;
    
    IF NEW.status = 'approved' THEN
      -- Notify sender that message was approved
      IF pref_record IS NULL OR pref_record.inapp_on_message_approved IS NULL OR pref_record.inapp_on_message_approved = true THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          metadata
        ) VALUES (
          NEW.sent_by,
          'message_approved',
          'Your message was approved!',
          'Your message "' || COALESCE(NEW.subject, 'No subject') || '" has been approved and sent to sponsors.',
          '/bestie-messages',
          jsonb_build_object('message_id', NEW.id)
        );
      END IF;
    ELSIF NEW.status = 'rejected' THEN
      -- Notify sender that message was rejected
      IF pref_record IS NULL OR pref_record.inapp_on_message_rejected IS NULL OR pref_record.inapp_on_message_rejected = true THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          metadata
        ) VALUES (
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

-- Create trigger for message status changes
DROP TRIGGER IF EXISTS notify_sponsor_message_status_change ON sponsor_messages;
CREATE TRIGGER notify_sponsor_message_status_change
AFTER UPDATE ON sponsor_messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_sponsor_message_status_change();

-- Update content_like trigger to respect user preferences
CREATE OR REPLACE FUNCTION notify_on_coloring_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  coloring_owner_id UUID;
  coloring_title TEXT;
  liker_name TEXT;
  pref_record RECORD;
BEGIN
  -- Get the coloring owner and title
  SELECT user_id, title INTO coloring_owner_id, coloring_title 
  FROM user_colorings 
  WHERE id = NEW.coloring_id;
  
  -- Don't notify if liking own coloring
  IF coloring_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  
  -- Check user preferences
  SELECT * INTO pref_record FROM notification_preferences WHERE user_id = coloring_owner_id;
  
  -- Only create notification if preference allows
  IF pref_record IS NULL OR pref_record.inapp_on_content_like IS NULL OR pref_record.inapp_on_content_like = true THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      coloring_owner_id,
      'content_like',
      'Someone liked your coloring!',
      COALESCE(liker_name, 'Someone') || ' liked your coloring "' || COALESCE(coloring_title, 'Untitled') || '"',
      '/games/coloring',
      jsonb_build_object('coloring_id', NEW.coloring_id, 'liker_id', NEW.user_id, 'content_type', 'coloring')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update drink likes trigger to respect preferences
CREATE OR REPLACE FUNCTION notify_on_drink_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  drink_owner_id UUID;
  drink_name TEXT;
  liker_name TEXT;
  pref_record RECORD;
BEGIN
  -- Get the drink owner and name
  SELECT user_id, name INTO drink_owner_id, drink_name 
  FROM custom_drinks 
  WHERE id = NEW.drink_id;
  
  -- Don't notify if liking own drink
  IF drink_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  
  -- Check user preferences
  SELECT * INTO pref_record FROM notification_preferences WHERE user_id = drink_owner_id;
  
  IF pref_record IS NULL OR pref_record.inapp_on_content_like IS NULL OR pref_record.inapp_on_content_like = true THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      drink_owner_id,
      'content_like',
      'Someone liked your drink!',
      COALESCE(liker_name, 'Someone') || ' liked your drink "' || COALESCE(drink_name, 'Untitled') || '"',
      '/games/drink-mixer',
      jsonb_build_object('drink_id', NEW.drink_id, 'liker_id', NEW.user_id, 'content_type', 'drink')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update recipe likes trigger to respect preferences
CREATE OR REPLACE FUNCTION notify_on_recipe_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipe_owner_id UUID;
  recipe_title TEXT;
  liker_name TEXT;
  pref_record RECORD;
BEGIN
  -- Get the recipe owner and title
  SELECT creator_id, title INTO recipe_owner_id, recipe_title 
  FROM public_recipes 
  WHERE id = NEW.recipe_id;
  
  -- Don't notify if liking own recipe
  IF recipe_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's name
  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  
  -- Check user preferences
  SELECT * INTO pref_record FROM notification_preferences WHERE user_id = recipe_owner_id;
  
  IF pref_record IS NULL OR pref_record.inapp_on_content_like IS NULL OR pref_record.inapp_on_content_like = true THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      recipe_owner_id,
      'content_like',
      'Someone liked your recipe!',
      COALESCE(liker_name, 'Someone') || ' liked your recipe "' || COALESCE(recipe_title, 'Untitled') || '"',
      '/games/recipe-gallery?tab=community',
      jsonb_build_object('recipe_id', NEW.recipe_id, 'liker_id', NEW.user_id, 'content_type', 'recipe')
    );
  END IF;
  
  RETURN NEW;
END;
$$;