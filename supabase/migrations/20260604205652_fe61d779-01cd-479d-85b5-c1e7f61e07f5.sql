DROP POLICY IF EXISTS "Anyone can view scenic photos" ON public.bike_ride_scenic_photos;
CREATE POLICY "Public can view scenic photos" ON public.bike_ride_scenic_photos FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.bike_ride_scenic_photos TO anon;