-- Update handle_new_user to process avatar data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  RETURN NEW;
END;
$$;