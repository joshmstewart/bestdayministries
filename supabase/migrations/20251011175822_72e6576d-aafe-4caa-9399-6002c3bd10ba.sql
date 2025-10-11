-- Drop the problematic constraint and recreate with length check for emoji sequences
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS friend_code_length_check;

-- Add a more lenient constraint that allows for emoji variation selectors
ALTER TABLE profiles ADD CONSTRAINT friend_code_length_check 
  CHECK (friend_code IS NULL OR length(friend_code) BETWEEN 3 AND 15);

-- Now update existing NULL friend codes with the corrected function
DO $$
DECLARE
  profile_record RECORD;
  new_code TEXT;
  -- Use emojis without variation selectors
  emoji_set TEXT[] := ARRAY['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡', '🎨', '🎭', '🎪', '🏰', '🌵', '🦋', '🐉', '🎯', '🎺', '🌴'];
BEGIN
  FOR profile_record IN 
    SELECT id FROM profiles WHERE friend_code IS NULL
  LOOP
    new_code := emoji_set[1 + floor(random() * 20)::int] || 
                emoji_set[1 + floor(random() * 20)::int] || 
                emoji_set[1 + floor(random() * 20)::int];
    
    UPDATE profiles 
    SET friend_code = new_code 
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Update the trigger function to use the same emoji set
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_friend_code TEXT;
  emoji_set TEXT[] := ARRAY['🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡', '🎨', '🎭', '🎪', '🏰', '🌵', '🦋', '🐉', '🎯', '🎺', '🌴'];
BEGIN
  -- Generate random 3-emoji friend code
  new_friend_code := emoji_set[1 + floor(random() * 20)::int] || 
                     emoji_set[1 + floor(random() * 20)::int] || 
                     emoji_set[1 + floor(random() * 20)::int];
  
  -- Insert into profiles with email and friend code
  INSERT INTO public.profiles (id, display_name, email, friend_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member'),
    NEW.email,
    new_friend_code
  )
  ON CONFLICT (id) DO UPDATE 
  SET display_name = EXCLUDED.display_name,
      email = EXCLUDED.email,
      friend_code = COALESCE(profiles.friend_code, EXCLUDED.friend_code);
  
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