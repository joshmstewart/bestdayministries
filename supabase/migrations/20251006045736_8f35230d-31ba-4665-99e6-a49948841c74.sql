-- Add video support to sponsor messages
ALTER TABLE sponsor_messages
ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN sponsor_messages.video_url IS 'URL to video message stored in app-assets bucket';