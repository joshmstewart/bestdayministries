
DROP POLICY IF EXISTS "Users can view own pledges" ON public.bike_ride_pledges;

CREATE POLICY "Users can view own pledges"
  ON public.bike_ride_pledges
  FOR SELECT
  USING (
    pledger_user_id = auth.uid()
    OR pledger_email = public.get_user_email(auth.uid())
  );
