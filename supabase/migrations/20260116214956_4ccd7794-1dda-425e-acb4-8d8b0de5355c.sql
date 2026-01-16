
-- Remove the bad trigger that auto-creates vendors for team members
-- Team members should access the existing vendor, NOT get their own vendor record
DROP TRIGGER IF EXISTS on_team_member_added ON public.vendor_team_members;
DROP FUNCTION IF EXISTS public.auto_create_vendor_for_team_member();
