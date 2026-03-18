
-- Add race_url and route_waypoints to bike_ride_events
ALTER TABLE public.bike_ride_events 
  ADD COLUMN IF NOT EXISTS race_url TEXT,
  ADD COLUMN IF NOT EXISTS route_waypoints JSONB;

-- Create scenic photos table
CREATE TABLE IF NOT EXISTS public.bike_ride_scenic_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.bike_ride_events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bike_ride_scenic_photos ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can view
CREATE POLICY "Anyone can view scenic photos" ON public.bike_ride_scenic_photos
  FOR SELECT TO authenticated USING (true);

-- RLS: admins can manage
CREATE POLICY "Admins can manage scenic photos" ON public.bike_ride_scenic_photos
  FOR ALL TO authenticated USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());
