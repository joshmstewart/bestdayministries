-- Add 'duplicate' status to donations table constraint
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE donations ADD CONSTRAINT donations_status_check 
  CHECK (status IN ('pending', 'completed', 'active', 'cancelled', 'paused', 'duplicate'));