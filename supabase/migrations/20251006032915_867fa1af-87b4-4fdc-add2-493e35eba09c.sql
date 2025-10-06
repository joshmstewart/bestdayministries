-- Add email field for guest sponsorships
ALTER TABLE public.sponsorships
ADD COLUMN sponsor_email TEXT;

-- Make sponsor_id nullable for guest checkouts
ALTER TABLE public.sponsorships
ALTER COLUMN sponsor_id DROP NOT NULL;

-- Create function to link guest sponsorships when user signs up
CREATE OR REPLACE FUNCTION public.link_guest_sponsorships()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Update any guest sponsorships with matching email
  UPDATE public.sponsorships
  SET sponsor_id = NEW.id,
      sponsor_email = NULL
  WHERE sponsor_email = user_email
    AND sponsor_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_link_sponsorships ON auth.users;
CREATE TRIGGER on_auth_user_created_link_sponsorships
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_guest_sponsorships();

-- Update RLS policy to include guest sponsorships by email
DROP POLICY IF EXISTS "Sponsors view their own" ON public.sponsorships;
CREATE POLICY "Sponsors view their own" ON public.sponsorships
  FOR SELECT
  USING (
    auth.uid() = sponsor_id 
    OR (
      sponsor_email IS NOT NULL 
      AND sponsor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );