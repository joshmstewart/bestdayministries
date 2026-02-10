-- Allow authenticated users to read approved fortunes
CREATE POLICY "Authenticated users can view approved fortunes"
  ON public.daily_fortunes
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_approved = true);
