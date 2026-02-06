-- Allow admins to insert health check results from manual checks
CREATE POLICY "Admins can insert health check results"
  ON public.health_check_results FOR INSERT
  WITH CHECK (public.is_admin_or_owner());