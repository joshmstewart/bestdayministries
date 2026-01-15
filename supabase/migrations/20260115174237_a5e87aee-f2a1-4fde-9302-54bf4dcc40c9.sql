-- Add prayer notification columns to notification_preferences table
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS email_on_prayer_pending_approval boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_prayer_approved boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_prayer_rejected boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_prayed_for_you boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_prayer_expiring boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_prayer_pending_approval boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_prayer_approved boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_prayer_rejected boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_prayed_for_you boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_on_prayer_expiring boolean DEFAULT true;