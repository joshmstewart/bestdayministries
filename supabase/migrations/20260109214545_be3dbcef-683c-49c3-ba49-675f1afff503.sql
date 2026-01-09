-- Add bestie_emoji column to navigation_links table
-- This emoji will only be shown to users with the 'bestie' role
ALTER TABLE public.navigation_links 
ADD COLUMN bestie_emoji text;