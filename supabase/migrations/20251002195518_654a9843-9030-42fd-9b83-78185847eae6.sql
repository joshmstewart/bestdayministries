-- First, drop all SELECT policies on sponsorships
DROP POLICY IF EXISTS "Sponsorships viewable by sponsor or bestie" ON public.sponsorships;
DROP POLICY IF EXISTS "Shared besties can view sponsorships" ON public.sponsorships;

-- Create a security definer function to check sponsorship access
CREATE OR REPLACE FUNCTION public.can_view_sponsorship(_sponsorship_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User is the sponsor
    SELECT 1 FROM public.sponsorships 
    WHERE id = _sponsorship_id AND sponsor_id = _user_id
  ) OR EXISTS (
    -- User is the bestie
    SELECT 1 FROM public.sponsorships 
    WHERE id = _sponsorship_id AND bestie_id = _user_id
  ) OR EXISTS (
    -- Sponsorship has been shared with user
    SELECT 1 FROM public.sponsorship_shares 
    WHERE sponsorship_id = _sponsorship_id AND bestie_id = _user_id
  );
$$;

-- Create a single consolidated SELECT policy using the security definer function
CREATE POLICY "Users can view accessible sponsorships"
ON public.sponsorships
FOR SELECT
USING (public.can_view_sponsorship(id, auth.uid()));