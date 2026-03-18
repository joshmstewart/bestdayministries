
ALTER TABLE public.bike_ride_events
  ADD COLUMN IF NOT EXISTS elevation_gain_ft integer,
  ADD COLUMN IF NOT EXISTS difficulty_rating text,
  ADD COLUMN IF NOT EXISTS ridewithgps_url text,
  ADD COLUMN IF NOT EXISTS aid_stations jsonb,
  ADD COLUMN IF NOT EXISTS key_climbs text[],
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS registration_url text,
  ADD COLUMN IF NOT EXISTS finish_description text,
  ADD COLUMN IF NOT EXISTS route_description text;
