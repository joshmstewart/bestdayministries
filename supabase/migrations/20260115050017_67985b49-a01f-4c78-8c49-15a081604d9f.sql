-- Add image_url and moderation columns to prayer_requests
ALTER TABLE public.prayer_requests 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_moderation_status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS image_moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS image_moderation_severity TEXT;