-- Create table for storing word themes
CREATE TABLE public.wordle_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for daily words
CREATE TABLE public.wordle_daily_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  theme_id UUID REFERENCES public.wordle_themes(id),
  word_date DATE NOT NULL UNIQUE,
  hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking user game attempts
CREATE TABLE public.wordle_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_word_id UUID NOT NULL REFERENCES public.wordle_daily_words(id) ON DELETE CASCADE,
  guesses TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'won', 'lost')),
  hints_used INTEGER NOT NULL DEFAULT 0,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, daily_word_id)
);

-- Enable RLS
ALTER TABLE public.wordle_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordle_daily_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordle_attempts ENABLE ROW LEVEL SECURITY;

-- Wordle themes: Anyone can view active themes, admins can manage
CREATE POLICY "Anyone can view active themes" ON public.wordle_themes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage themes" ON public.wordle_themes
  FOR ALL USING (has_admin_access(auth.uid()));

-- Daily words: Auth users can view today's and past words
CREATE POLICY "Auth users can view daily words metadata" ON public.wordle_daily_words
  FOR SELECT TO authenticated USING (word_date <= CURRENT_DATE);

CREATE POLICY "Admins can manage daily words" ON public.wordle_daily_words
  FOR ALL USING (has_admin_access(auth.uid()));

-- Attempts: Users can manage their own attempts
CREATE POLICY "Users can view own attempts" ON public.wordle_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts" ON public.wordle_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts" ON public.wordle_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all attempts
CREATE POLICY "Admins can view all attempts" ON public.wordle_attempts
  FOR SELECT USING (has_admin_access(auth.uid()));

-- Insert default themes
INSERT INTO public.wordle_themes (name, description, emoji, display_order) VALUES
  ('Animals', 'Words related to animals', '🐾', 1),
  ('Food', 'Delicious food words', '🍕', 2),
  ('Nature', 'Words from the natural world', '🌿', 3),
  ('Colors', 'Color-related words', '🎨', 4),
  ('Home', 'Things around the house', '🏠', 5),
  ('Sports', 'Athletic and sports words', '⚽', 6),
  ('Music', 'Musical terms and instruments', '🎵', 7),
  ('Weather', 'Weather and climate words', '☀️', 8);

-- Add coin rewards setting for wordle
INSERT INTO public.coin_rewards_settings (reward_key, reward_name, coins_amount, category, description, is_active)
VALUES 
  ('wordle_win_1_guess', 'Wordle - Win in 1 Guess', 100, 'games', 'Bonus for solving Wordle in 1 guess', true),
  ('wordle_win_2_guesses', 'Wordle - Win in 2 Guesses', 75, 'games', 'Bonus for solving Wordle in 2 guesses', true),
  ('wordle_win_3_guesses', 'Wordle - Win in 3 Guesses', 50, 'games', 'Bonus for solving Wordle in 3 guesses', true),
  ('wordle_win_4_guesses', 'Wordle - Win in 4 Guesses', 35, 'games', 'Bonus for solving Wordle in 4 guesses', true),
  ('wordle_win_5_guesses', 'Wordle - Win in 5 Guesses', 25, 'games', 'Bonus for solving Wordle in 5 guesses', true),
  ('wordle_win_6_guesses', 'Wordle - Win in 6 Guesses', 15, 'games', 'Bonus for solving Wordle in 6 guesses', true)
ON CONFLICT (reward_key) DO NOTHING;