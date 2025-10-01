-- Update the user with email stewart.m.joshua@gmail.com to have admin role
-- This will only work after the user has signed up
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user id from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'stewart.m.joshua@gmail.com';
  
  -- If user exists, update their role to admin
  IF admin_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'User % has been set as admin', admin_user_id;
  ELSE
    RAISE NOTICE 'User with email stewart.m.joshua@gmail.com not found. Please sign up first.';
  END IF;
END $$;