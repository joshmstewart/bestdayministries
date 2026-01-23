-- Add a dedicated link field to events
ALTER TABLE public.events
ADD COLUMN link_url TEXT,
ADD COLUMN link_label TEXT DEFAULT 'Learn More';