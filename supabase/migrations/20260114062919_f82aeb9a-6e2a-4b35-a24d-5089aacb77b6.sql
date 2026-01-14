-- Create cash register user stats table (similar to wordle_user_stats)
CREATE TABLE public.cash_register_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  high_score INTEGER NOT NULL DEFAULT 0,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  total_levels_completed INTEGER NOT NULL DEFAULT 0,
  best_level INTEGER NOT NULL DEFAULT 0,
  current_month_score INTEGER DEFAULT 0,
  current_month_year TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_register_user_stats ENABLE ROW LEVEL SECURITY;

-- Users can view all stats (for leaderboard)
CREATE POLICY "Anyone can view cash register stats"
  ON public.cash_register_user_stats
  FOR SELECT
  USING (true);

-- Users can insert their own stats
CREATE POLICY "Users can insert their own stats"
  ON public.cash_register_user_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "Users can update their own stats"
  ON public.cash_register_user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_cash_register_user_stats_updated_at
  BEFORE UPDATE ON public.cash_register_user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_register_user_stats;