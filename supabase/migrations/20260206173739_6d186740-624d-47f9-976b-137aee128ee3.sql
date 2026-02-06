
-- Update handle_new_user to also set profile_avatar_id from signup metadata
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
  profile_avatar_id_value UUID;
  emoji_set TEXT[] := ARRAY['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡', '🎨', '🎭', '🎪', '🏰', '🌵', '🦋', '🐉', '🎯', '🎺', '🌴'];
BEGIN
  -- Generate random 3-emoji friend code
  new_friend_code := emoji_set[1 + floor(random() * 20)::int] || 
                     emoji_set[1 + floor(random() * 20)::int] || 
                     emoji_set[1 + floor(random() * 20)::int];
  
  -- Extract avatar data if present
  avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';
  
  -- Parse avatar number from 'avatar-{number}' format (legacy)
  IF avatar_url_value IS NOT NULL AND avatar_url_value LIKE 'avatar-%' THEN
    avatar_num := substring(avatar_url_value FROM 'avatar-(\d+)')::INTEGER;
  ELSE
    avatar_num := NULL;
  END IF;
  
  -- Extract profile_avatar_id (new fitness avatar system)
  IF NEW.raw_user_meta_data->>'profile_avatar_id' IS NOT NULL THEN
    profile_avatar_id_value := (NEW.raw_user_meta_data->>'profile_avatar_id')::UUID;
  ELSE
    profile_avatar_id_value := NULL;
  END IF;
  
  -- Insert into profiles with email, friend code, avatar, and profile_avatar_id
  INSERT INTO public.profiles (id, display_name, email, friend_code, avatar_number, profile_avatar_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member'),
    NEW.email,
    new_friend_code,
    avatar_num,
    profile_avatar_id_value
  )
  ON CONFLICT (id) DO UPDATE 
  SET display_name = EXCLUDED.display_name,
      email = EXCLUDED.email,
      friend_code = COALESCE(profiles.friend_code, EXCLUDED.friend_code),
      avatar_number = EXCLUDED.avatar_number,
      profile_avatar_id = COALESCE(EXCLUDED.profile_avatar_id, profiles.profile_avatar_id);
  
  -- If profile_avatar_id was set, also create a user_fitness_avatars record
  IF profile_avatar_id_value IS NOT NULL THEN
    INSERT INTO public.user_fitness_avatars (user_id, avatar_id, is_selected)
    VALUES (NEW.id, profile_avatar_id_value, true)
    ON CONFLICT DO NOTHING;
  END IF;
  
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
