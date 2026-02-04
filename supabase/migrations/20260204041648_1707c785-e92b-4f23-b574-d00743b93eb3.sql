-- Add max_attempts column to newsletter_email_queue for configurable retry limits
ALTER TABLE newsletter_email_queue 
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3;