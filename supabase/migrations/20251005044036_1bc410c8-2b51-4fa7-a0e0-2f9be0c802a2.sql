-- Add audio message support and guardian messaging to sponsor_messages
ALTER TABLE sponsor_messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS from_guardian BOOLEAN DEFAULT FALSE;

-- Add comments for clarity
COMMENT ON COLUMN sponsor_messages.audio_url IS 'URL to audio message file in storage';
COMMENT ON COLUMN sponsor_messages.sent_by IS 'User ID of who actually created the message (bestie or guardian)';
COMMENT ON COLUMN sponsor_messages.from_guardian IS 'TRUE if message is from guardian, FALSE if from bestie';