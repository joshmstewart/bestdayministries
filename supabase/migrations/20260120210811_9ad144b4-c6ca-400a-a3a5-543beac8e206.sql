-- Add shared_at column to track when jokes are shared publicly
ALTER TABLE saved_jokes ADD COLUMN shared_at TIMESTAMP WITH TIME ZONE;

-- Backfill: for existing public jokes, use updated_at as a reasonable approximation
UPDATE saved_jokes SET shared_at = updated_at WHERE is_public = true;