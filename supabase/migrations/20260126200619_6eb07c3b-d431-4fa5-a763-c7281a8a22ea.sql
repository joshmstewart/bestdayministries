-- Track monthly leaderboard rewards to prevent duplicates
CREATE TABLE IF NOT EXISTS cash_register_leaderboard_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_month text NOT NULL, -- Format: "2026-01"
  duration_seconds integer NOT NULL,
  rank integer NOT NULL,
  coins_awarded integer NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reward_month, duration_seconds)
);

ALTER TABLE cash_register_leaderboard_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards"
  ON cash_register_leaderboard_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage rewards"
  ON cash_register_leaderboard_rewards FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner());