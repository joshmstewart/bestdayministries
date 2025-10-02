-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the handle_new_user trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'supporter')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = NEW.email;
  RETURN NEW;
END;
$$;