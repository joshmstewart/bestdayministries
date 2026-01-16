-- Create a function to auto-create vendor record when team member is added
CREATE OR REPLACE FUNCTION public.auto_create_vendor_for_team_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_vendor RECORD;
BEGIN
  -- Get the parent vendor's info to create a similar record
  SELECT business_name INTO parent_vendor 
  FROM public.vendors 
  WHERE id = NEW.vendor_id;
  
  -- Check if the user already has a vendor record
  IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE user_id = NEW.user_id) THEN
    -- Create a new vendor record for the team member
    INSERT INTO public.vendors (
      user_id,
      business_name,
      status,
      description
    ) VALUES (
      NEW.user_id,
      'Team Member - ' || COALESCE(parent_vendor.business_name, 'Store'),
      'approved',
      'Auto-created vendor account for team member access'
    );
  ELSE
    -- If they already have a vendor record but it's not approved, approve it
    UPDATE public.vendors 
    SET status = 'approved'
    WHERE user_id = NEW.user_id 
    AND status != 'approved';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_team_member_added ON public.vendor_team_members;
CREATE TRIGGER on_team_member_added
  AFTER INSERT ON public.vendor_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_vendor_for_team_member();