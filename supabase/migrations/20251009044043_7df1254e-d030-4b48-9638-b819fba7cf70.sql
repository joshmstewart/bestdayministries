-- Drop and recreate the view without security definer
DROP VIEW IF EXISTS game_leaderboard;

CREATE VIEW game_leaderboard AS
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