-- Allow anyone (including unauthenticated users) to view sent newsletters
CREATE POLICY "Anyone can view sent newsletters"
  ON public.newsletter_campaigns FOR SELECT
  USING (status = 'sent');