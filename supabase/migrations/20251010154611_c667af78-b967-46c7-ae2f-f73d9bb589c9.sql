-- Fix RLS policy for issue_reports table to allow admins to view all reports
DROP POLICY IF EXISTS "Admins can view issue reports" ON public.issue_reports;

CREATE POLICY "Admins can view all issue reports"
ON public.issue_reports
FOR SELECT
TO authenticated
USING (
  has_admin_access(auth.uid())
);