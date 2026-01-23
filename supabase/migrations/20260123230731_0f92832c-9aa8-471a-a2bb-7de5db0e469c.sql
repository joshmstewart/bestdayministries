-- Add link fields to event_email_queue
ALTER TABLE public.event_email_queue 
ADD COLUMN IF NOT EXISTS event_link_url TEXT,
ADD COLUMN IF NOT EXISTS event_link_label TEXT DEFAULT 'Learn More';