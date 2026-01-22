-- Create email queue table for badge earned notifications
CREATE TABLE IF NOT EXISTS public.badge_earned_email_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  badge_name text NOT NULL,
  badge_description text,
  badge_icon text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  error_message text
);

-- Enable RLS
ALTER TABLE public.badge_earned_email_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage badge earned email queue"
  ON public.badge_earned_email_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'owner')
    )
  );

-- Update badge earned trigger to also queue email
CREATE OR REPLACE FUNCTION public.notify_on_badge_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inapp_enabled boolean;
  v_email_enabled boolean;
  v_recipient_email text;
  v_recipient_name text;
BEGIN
  -- Check if user has in-app notifications enabled
  SELECT COALESCE(inapp_on_badge_earned, true) INTO v_inapp_enabled
  FROM notification_preferences
  WHERE user_id = NEW.user_id;
  
  IF v_inapp_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'badge_earned',
      'You earned a badge! 🏆',
      'Congratulations! You earned the "' || NEW.badge_name || '" badge!',
      '/games/daily-challenge'
    );
  END IF;
  
  -- Check if user has email notifications enabled for badges
  SELECT email_on_badge_earned INTO v_email_enabled
  FROM notification_preferences
  WHERE user_id = NEW.user_id;
  
  IF v_email_enabled IS TRUE THEN
    -- Get recipient info
    SELECT email INTO v_recipient_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    SELECT COALESCE(display_name, 'Friend') INTO v_recipient_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    IF v_recipient_email IS NOT NULL THEN
      INSERT INTO badge_earned_email_queue (
        recipient_user_id,
        recipient_email,
        recipient_name,
        badge_name,
        badge_description,
        badge_icon
      ) VALUES (
        NEW.user_id,
        v_recipient_email,
        v_recipient_name,
        NEW.badge_name,
        NEW.badge_description,
        NEW.badge_icon
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;