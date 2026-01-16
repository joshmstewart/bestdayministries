-- Add contact_email column to vendors table
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS contact_email text;

-- Update RLS policy to allow team members to update vendor settings
DROP POLICY IF EXISTS "Vendors can update own profile" ON public.vendors;
CREATE POLICY "Vendors and team members can update vendor profile"
ON public.vendors
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  public.is_vendor_team_member(id, auth.uid())
)
WITH CHECK (
  user_id = auth.uid() OR
  public.is_vendor_team_member(id, auth.uid())
);