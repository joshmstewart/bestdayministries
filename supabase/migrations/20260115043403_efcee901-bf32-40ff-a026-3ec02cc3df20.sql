-- Add new columns for TTL, anonymous sharing, and gratitude
ALTER TABLE public.prayer_requests 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS share_duration TEXT DEFAULT '1_month',
ADD COLUMN IF NOT EXISTS gratitude_message TEXT,
ADD COLUMN IF NOT EXISTS expiry_notified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for expiration checks
CREATE INDEX IF NOT EXISTS idx_prayer_requests_expires_at ON public.prayer_requests(expires_at) WHERE is_public = true AND expires_at IS NOT NULL;

-- Create index for expiry notifications
CREATE INDEX IF NOT EXISTS idx_prayer_requests_expiry_notified ON public.prayer_requests(expiry_notified, expires_at) WHERE is_public = true;

-- Update RLS policy for anonymous public prayers - allow viewing without revealing user
CREATE OR REPLACE FUNCTION public.get_prayer_creator_name(prayer_user_id UUID, prayer_is_anonymous BOOLEAN)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN prayer_is_anonymous THEN 'Anonymous'
    ELSE COALESCE(
      (SELECT display_name FROM public.profiles WHERE id = prayer_user_id),
      'Anonymous'
    )
  END;
$$;