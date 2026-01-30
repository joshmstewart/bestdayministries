-- Add reward setting for daily engagement completion bonus
INSERT INTO coin_rewards_settings (reward_key, reward_name, coins_amount, description, is_active)
VALUES ('daily_engagement_complete', 'Daily Engagement Complete', 50, 'Bonus for completing all daily engagement activities', true)
ON CONFLICT (reward_key) DO UPDATE SET
  reward_name = EXCLUDED.reward_name,
  coins_amount = EXCLUDED.coins_amount,
  description = EXCLUDED.description;

-- Create table to track daily engagement completion bonuses
CREATE TABLE IF NOT EXISTS daily_engagement_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  coins_awarded INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, completion_date)
);

-- Enable RLS
ALTER TABLE daily_engagement_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own daily engagement completions"
  ON daily_engagement_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own daily engagement completions"
  ON daily_engagement_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_daily_engagement_completions_user_date 
  ON daily_engagement_completions(user_id, completion_date);