-- Add hours_vary_seasonally flag to joy_house_store_locations
ALTER TABLE public.joy_house_store_locations 
ADD COLUMN hours_vary_seasonally BOOLEAN NOT NULL DEFAULT false;