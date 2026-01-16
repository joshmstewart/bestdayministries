
-- Drop and recreate the function with correct parameter names
DROP FUNCTION IF EXISTS public.is_vendor_team_member(uuid, uuid);

CREATE OR REPLACE FUNCTION public.is_vendor_team_member(check_vendor_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vendor_team_members
    WHERE vendor_id = check_vendor_id
    AND user_id = check_user_id
    AND accepted_at IS NOT NULL
  )
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_vendor_team_member(uuid, uuid) TO authenticated;
