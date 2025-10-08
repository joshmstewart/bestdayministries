-- Add discussion notification preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_comment_on_post boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_comment_on_thread boolean NOT NULL DEFAULT true;