-- Add tracking fields for email engagement to automated_campaign_sends
ALTER TABLE automated_campaign_sends
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS complained_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_automated_campaign_sends_status 
ON automated_campaign_sends(status);

-- Add index for faster lookups by email for webhook matching
CREATE INDEX IF NOT EXISTS idx_automated_campaign_sends_recipient_email 
ON automated_campaign_sends(recipient_email, sent_at DESC);