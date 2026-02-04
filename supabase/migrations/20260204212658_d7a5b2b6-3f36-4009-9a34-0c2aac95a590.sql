-- Add email client and layout fallback tracking to newsletter_analytics
ALTER TABLE public.newsletter_analytics 
ADD COLUMN IF NOT EXISTS email_client VARCHAR(100),
ADD COLUMN IF NOT EXISTS email_client_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS device_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS os_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS layout_fallback_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS layout_fallback_reason TEXT;