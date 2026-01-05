-- Create coin_rewards_settings table for configurable coin rewards
CREATE TABLE IF NOT EXISTS coin_rewards_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_key text NOT NULL UNIQUE,
  reward_name text NOT NULL,
  description text,
  coins_amount integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  category text NOT NULL DEFAULT 'other',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE coin_rewards_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Anyone can read coin rewards settings"
  ON coin_rewards_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage coin rewards settings"
  ON coin_rewards_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'owner')
    )
  );

-- Insert default reward configurations
INSERT INTO coin_rewards_settings (reward_key, reward_name, description, coins_amount, category, is_active) VALUES
  ('memory_match_easy', 'Memory Match - Easy', 'Complete an easy Memory Match game', 10, 'games', true),
  ('memory_match_medium', 'Memory Match - Medium', 'Complete a medium Memory Match game', 20, 'games', true),
  ('memory_match_hard', 'Memory Match - Hard', 'Complete a hard Memory Match game', 30, 'games', true),
  ('brew_blast_easy', 'Brew Blast - Easy', 'Complete an easy Brew Blast game', 5, 'games', true),
  ('brew_blast_medium', 'Brew Blast - Medium', 'Complete a medium Brew Blast game', 8, 'games', true),
  ('brew_blast_hard', 'Brew Blast - Hard', 'Complete a hard Brew Blast game', 12, 'games', true),
  ('daily_scratch_card', 'Daily Scratch Card', 'Daily free scratch card reward', 0, 'daily', true),
  ('pet_feed', 'Feed Pet', 'Feed your virtual pet', 5, 'pets', true),
  ('pet_play', 'Play with Pet', 'Play with your virtual pet', 3, 'pets', true)
ON CONFLICT (reward_key) DO NOTHING;