-- Add aspect_ratio column to featured_besties table
ALTER TABLE public.featured_besties
ADD COLUMN aspect_ratio text NOT NULL DEFAULT 'portrait';