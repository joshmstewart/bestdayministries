-- 1. Backfill notification_preferences for all existing users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles 
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Add retry_count column to event_email_queue
ALTER TABLE event_email_queue 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 3. Update handle_new_user() to auto-create notification preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_friend_code TEXT;
  avatar_url_value TEXT;
  avatar_num INTEGER;
  emoji_set TEXT[] := ARRAY['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡', '🎨', '🎭', '🎪', '🏰', '🌵', '🦋', '🐉', '🎯', '🎺', '🌴'];
BEGIN
  -- Generate random 3-emoji friend code
  new_friend_code := emoji_set[1 + floor(random() * 20)::int] || 
                     emoji_set[1 + floor(random() * 20)::int] || 
                     emoji_set[1 + floor(random() * 20)::int];
  
  -- Extract avatar data if present
  avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';
  
  -- Parse avatar number from 'avatar-{number}' format
  IF avatar_url_value IS NOT NULL AND avatar_url_value LIKE 'avatar-%' THEN
    avatar_num := substring(avatar_url_value FROM 'avatar-(\d+)')::INTEGER;
  ELSE
    avatar_num := NULL;
  END IF;
  
  -- Insert into profiles with email, friend code, and avatar
  INSERT INTO public.profiles (id, display_name, email, friend_code, avatar_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member'),
    NEW.email,
    new_friend_code,
    avatar_num
  )
  ON CONFLICT (id) DO UPDATE 
  SET display_name = EXCLUDED.display_name,
      email = EXCLUDED.email,
      friend_code = COALESCE(profiles.friend_code, EXCLUDED.friend_code),
      avatar_number = EXCLUDED.avatar_number;
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'supporter'),
    NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create default notification preferences for new user
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 4. Fix queue_event_emails() trigger to use correct column name and include author
CREATE OR REPLACE FUNCTION public.queue_event_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue emails for published, public, active events
  IF NEW.status = 'published' AND NEW.is_public = true AND NEW.is_active = true THEN
    -- Queue emails for all users with email_on_new_event enabled (correct column name)
    -- Note: We include the author so they get confirmation their event was published
    INSERT INTO event_email_queue (
      user_id,
      user_email,
      event_id,
      event_title,
      event_date,
      event_location,
      event_image_url,
      event_link_url,
      event_link_label
    )
    SELECT 
      p.id,
      p.email,
      NEW.id,
      NEW.title,
      COALESCE(NEW.event_date, (SELECT MIN(date) FROM event_dates WHERE event_id = NEW.id)),
      NEW.location,
      NEW.image_url,
      NEW.link_url,
      NEW.link_label
    FROM profiles p
    JOIN notification_preferences np ON np.user_id = p.id
    WHERE np.email_on_new_event = true
      AND p.email IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;