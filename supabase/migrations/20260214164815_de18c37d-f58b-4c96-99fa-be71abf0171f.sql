
-- Create bike_ride_events table
CREATE TABLE public.bike_ride_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  rider_name TEXT NOT NULL,
  ride_date DATE NOT NULL,
  mile_goal NUMERIC NOT NULL CHECK (mile_goal > 0),
  actual_miles NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'charges_processed')),
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bike_ride_pledges table
CREATE TABLE public.bike_ride_pledges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.bike_ride_events(id) ON DELETE CASCADE,
  pledger_email TEXT NOT NULL,
  pledger_name TEXT NOT NULL,
  pledger_user_id UUID,
  pledge_type TEXT NOT NULL CHECK (pledge_type IN ('per_mile', 'flat')),
  cents_per_mile NUMERIC,
  flat_amount NUMERIC,
  calculated_total NUMERIC,
  stripe_customer_id TEXT,
  stripe_setup_intent_id TEXT,
  stripe_payment_method_id TEXT,
  stripe_payment_intent_id TEXT,
  charge_status TEXT NOT NULL DEFAULT 'pending' CHECK (charge_status IN ('pending', 'charged', 'failed')),
  charge_error TEXT,
  stripe_mode TEXT NOT NULL DEFAULT 'test' CHECK (stripe_mode IN ('test', 'live')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bike_ride_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_ride_pledges ENABLE ROW LEVEL SECURITY;

-- bike_ride_events policies
-- Anyone authenticated can view active events
CREATE POLICY "Anyone can view active events"
  ON public.bike_ride_events FOR SELECT TO authenticated
  USING (is_active = true AND status IN ('active', 'completed', 'charges_processed'));

-- Also allow anon to view active events (public pledge page)
CREATE POLICY "Anon can view active events"
  ON public.bike_ride_events FOR SELECT TO anon
  USING (is_active = true AND status IN ('active', 'completed', 'charges_processed'));

-- Admins can do everything
CREATE POLICY "Admins can manage events"
  ON public.bike_ride_events FOR ALL TO authenticated
  USING (public.is_admin_or_owner())
  WITH CHECK (public.is_admin_or_owner());

-- bike_ride_pledges policies
-- Users can view their own pledges
CREATE POLICY "Users can view own pledges"
  ON public.bike_ride_pledges FOR SELECT TO authenticated
  USING (pledger_user_id = auth.uid() OR pledger_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can view all pledges
CREATE POLICY "Admins can view all pledges"
  ON public.bike_ride_pledges FOR SELECT TO authenticated
  USING (public.is_admin_or_owner());

-- Admins can update pledges (for charge processing)
CREATE POLICY "Admins can update pledges"
  ON public.bike_ride_pledges FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner());

-- Insert is handled by edge function with service role, but allow authenticated inserts too
CREATE POLICY "Authenticated can insert pledges"
  ON public.bike_ride_pledges FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow anon inserts (guest pledgers via edge function)
CREATE POLICY "Anon can insert pledges"
  ON public.bike_ride_pledges FOR INSERT TO anon
  WITH CHECK (true);

-- Timestamp trigger for events
CREATE TRIGGER update_bike_ride_events_updated_at
  BEFORE UPDATE ON public.bike_ride_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for pledges (live stats)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bike_ride_pledges;
