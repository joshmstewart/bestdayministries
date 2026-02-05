-- Add column to track when analytics were last synced from Resend API
ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS analytics_synced_at TIMESTAMP WITH TIME ZONE;