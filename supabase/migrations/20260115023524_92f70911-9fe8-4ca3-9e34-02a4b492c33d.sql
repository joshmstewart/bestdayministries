-- Add plays_count column to track total loops played
ALTER TABLE beat_pad_creations ADD COLUMN IF NOT EXISTS plays_count INTEGER DEFAULT 0;