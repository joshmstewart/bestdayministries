-- Create game sessions table to track plays and scores
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  moves_count INTEGER NOT NULL DEFAULT 0,
  time_seconds INTEGER NOT NULL DEFAULT 0,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create game stats view
CREATE OR REPLACE VIEW game_leaderboard AS
SELECT 
  user_id,
  game_type,
  difficulty,
  MIN(moves_count) as best_moves,
  MIN(time_seconds) as best_time,
  MAX(score) as high_score,
  SUM(coins_earned) as total_coins,
  COUNT(*) as games_played
FROM game_sessions
GROUP BY user_id, game_type, difficulty;

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions" ON game_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON game_sessions
  FOR SELECT USING (has_admin_access(auth.uid()));

-- Create indexes
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_game_type ON game_sessions(game_type, difficulty);
CREATE INDEX idx_game_sessions_completed_at ON game_sessions(completed_at DESC);