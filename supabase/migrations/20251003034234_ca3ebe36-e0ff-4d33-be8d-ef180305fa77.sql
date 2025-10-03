-- Add aspect_ratio column to events table
ALTER TABLE public.events 
ADD COLUMN aspect_ratio text NOT NULL DEFAULT 'portrait' 
CHECK (aspect_ratio IN ('landscape', 'portrait'));