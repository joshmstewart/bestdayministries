-- Create wordle user stats table
CREATE TABLE public.wordle_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,
  last_win_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wordle_user_stats ENABLE ROW LEVEL SECURITY;

-- Users can view all stats (for leaderboard)
CREATE POLICY "Anyone can view wordle stats"
  ON public.wordle_user_stats
  FOR SELECT
  USING (true);

-- Only system can update stats (via service role in edge function)
CREATE POLICY "Service role can manage wordle stats"
  ON public.wordle_user_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add index for leaderboard queries
CREATE INDEX idx_wordle_user_stats_streak ON public.wordle_user_stats(current_streak DESC);
CREATE INDEX idx_wordle_user_stats_best_streak ON public.wordle_user_stats(best_streak DESC);
CREATE INDEX idx_wordle_user_stats_wins ON public.wordle_user_stats(total_wins DESC);