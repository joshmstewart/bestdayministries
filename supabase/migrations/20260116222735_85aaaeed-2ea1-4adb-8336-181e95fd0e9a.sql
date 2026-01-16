-- Create trigger function to automatically add vendor owner to team members
CREATE OR REPLACE FUNCTION public.add_vendor_owner_to_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only add if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.vendor_team_members (vendor_id, user_id, role, accepted_at)
    VALUES (NEW.id, NEW.user_id, 'owner', NOW())
    ON CONFLICT (vendor_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on vendors table
DROP TRIGGER IF EXISTS add_vendor_owner_to_team_trigger ON public.vendors;
CREATE TRIGGER add_vendor_owner_to_team_trigger
AFTER INSERT ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.add_vendor_owner_to_team();

-- Also add any existing vendors that are missing from team_members
INSERT INTO public.vendor_team_members (vendor_id, user_id, role, accepted_at)
SELECT id, user_id, 'owner'::vendor_team_role, created_at
FROM public.vendors
WHERE user_id IS NOT NULL
ON CONFLICT (vendor_id, user_id) DO NOTHING;