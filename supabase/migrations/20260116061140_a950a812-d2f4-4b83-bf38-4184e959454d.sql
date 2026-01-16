-- Add hours and seasonal variation flag to saved_locations
ALTER TABLE public.saved_locations 
ADD COLUMN hours TEXT,
ADD COLUMN hours_vary_seasonally BOOLEAN NOT NULL DEFAULT false;