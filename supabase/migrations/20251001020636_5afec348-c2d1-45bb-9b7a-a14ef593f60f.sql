-- Set the current user as owner
UPDATE public.profiles 
SET role = 'owner'
WHERE id = 'ad688e57-6077-455b-853b-a0fd0b458c2e';

-- Create a function to check if user is owner (for RLS policies)
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = 'owner'
  )
$$;