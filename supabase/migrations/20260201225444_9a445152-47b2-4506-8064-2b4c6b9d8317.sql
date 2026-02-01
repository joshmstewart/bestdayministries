-- Add icon_url column to app_configurations for custom app icons
ALTER TABLE public.app_configurations 
ADD COLUMN IF NOT EXISTS icon_url TEXT;