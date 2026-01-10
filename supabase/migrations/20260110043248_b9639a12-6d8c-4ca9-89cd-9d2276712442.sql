-- Add monthly tracking to wordle_user_stats
ALTER TABLE wordle_user_stats 
ADD COLUMN IF NOT EXISTS current_month_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_year TEXT DEFAULT to_char(NOW(), 'YYYY-MM');

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_wordle_user_stats_monthly ON wordle_user_stats (current_month_year, current_month_wins DESC);

-- Update RLS to allow reading all stats for leaderboard
DROP POLICY IF EXISTS "Users can read all stats for leaderboard" ON wordle_user_stats;
CREATE POLICY "Users can read all stats for leaderboard" ON wordle_user_stats
FOR SELECT USING (auth.uid() IS NOT NULL);