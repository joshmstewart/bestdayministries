-- Add pending_moderation to the message_status enum
ALTER TYPE message_status ADD VALUE IF NOT EXISTS 'pending_moderation';