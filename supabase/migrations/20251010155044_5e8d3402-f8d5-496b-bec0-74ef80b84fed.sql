-- Remove the problematic RLS policy that tries to access auth.users
DROP POLICY IF EXISTS "Users can view their own reports" ON public.issue_reports;

-- Remove duplicate admin view policy
DROP POLICY IF EXISTS "Admins can view all reports" ON public.issue_reports;

-- Keep only the correct admin policy
-- The "Admins can view all issue reports" policy already exists and is correct