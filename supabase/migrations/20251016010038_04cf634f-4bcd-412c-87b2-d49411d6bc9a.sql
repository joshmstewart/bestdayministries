-- Add enable_digest_emails to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS enable_digest_emails BOOLEAN NOT NULL DEFAULT true;

-- Add organization fields to sponsorship_receipts
ALTER TABLE public.sponsorship_receipts
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS organization_ein TEXT;