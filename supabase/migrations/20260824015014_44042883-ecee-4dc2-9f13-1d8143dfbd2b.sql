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
  first_name_value TEXT;
  last_name_value TEXT;
  display_name_value TEXT;
  attempt INTEGER := 0;
  emoji_set TEXT[] := ARRAY['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡', '🎨', '🎭', '🎪', '🏰', '🌵', '🦋', '🐉', '🎯', '🎺', '🌴'];
BEGIN
  -- Generate a UNIQUE random emoji friend code.
  -- 20^3 = 8000 combinations only, so blind generation collided with an
  -- existing code and aborted the whole signup with a 23505 error.
  LOOP
    attempt := attempt + 1;
    new_friend_code := emoji_set[1 + floor(random() * 20)::int] ||
                       emoji_set[1 + floor(random() * 20)::int] ||
                       emoji_set[1 + floor(random() * 20)::int];

    -- After 40 tries fall back to a 4-emoji code (160k combinations)
    IF attempt > 40 THEN
      new_friend_code := new_friend_code || emoji_set[1 + floor(random() * 20)::int];
    END IF;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.friend_code = new_friend_code
    );

    IF attempt > 80 THEN
      RAISE EXCEPTION 'Unable to generate a unique friend code';
    END IF;
  END LOOP;

  -- Extract avatar data if present
  avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';

  IF avatar_url_value IS NOT NULL AND avatar_url_value LIKE 'avatar-%' THEN
    avatar_num := substring(avatar_url_value FROM 'avatar-(\d+)')::INTEGER;
  ELSE
    avatar_num := NULL;
  END IF;

  IF NEW.raw_user_meta_data->>'profile_avatar_id' IS NOT NULL THEN
    profile_avatar_id_value := (NEW.raw_user_meta_data->>'profile_avatar_id')::UUID;
  ELSE
    profile_avatar_id_value := NULL;
  END IF;

  first_name_value := NEW.raw_user_meta_data->>'first_name';
  last_name_value := NEW.raw_user_meta_data->>'last_name';

  IF first_name_value IS NOT NULL AND last_name_value IS NOT NULL THEN
    display_name_value := first_name_value || ' ' || LEFT(last_name_value, 1);
  ELSE
    display_name_value := COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member');
  END IF;

  INSERT INTO public.profiles (id, display_name, first_name, last_name, email, friend_code, avatar_number, profile_avatar_id)
  VALUES (
    NEW.id,
    display_name_value,
    first_name_value,
    last_name_value,
    NEW.email,
    new_friend_code,
    avatar_num,
    profile_avatar_id_value
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      friend_code = COALESCE(profiles.friend_code, EXCLUDED.friend_code),
      avatar_number = EXCLUDED.avatar_number,
      profile_avatar_id = COALESCE(EXCLUDED.profile_avatar_id, profiles.profile_avatar_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'supporter')
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;