-- Fix rate_limits table RLS policies
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Add policy that blocks all direct client access
-- Rate limits should only be managed server-side via check_rate_limit() function
CREATE POLICY "Block direct client access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false)
WITH CHECK (false);

-- Remove email column from profiles table
-- Email is already stored in auth.users and doesn't need duplication
-- This prevents PII exposure through RLS policies
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update handle_new_user trigger to not set email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles without email (already in auth.users)
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Member')
  )
  ON CONFLICT (id) DO UPDATE 
  SET display_name = EXCLUDED.display_name;
  
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