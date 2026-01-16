
-- Add policy for team members to view their own membership
-- Check if policy exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'vendor_team_members' 
    AND policyname = 'Team members can view their own membership'
  ) THEN
    CREATE POLICY "Team members can view their own membership" ON public.vendor_team_members
    FOR SELECT USING (user_id = auth.uid());
  END IF;
END
$$;
