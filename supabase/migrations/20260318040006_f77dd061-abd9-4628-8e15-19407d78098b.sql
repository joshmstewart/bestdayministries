ALTER TABLE public.bike_ride_events ADD COLUMN slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_bike_ride_events_slug ON public.bike_ride_events(slug);