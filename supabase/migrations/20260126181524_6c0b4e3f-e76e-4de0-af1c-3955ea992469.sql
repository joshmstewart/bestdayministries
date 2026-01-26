-- Create table for cash register time trial scores
CREATE TABLE cash_register_time_trial_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL, -- 60, 120, or 300
  levels_completed INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for best scores per duration
CREATE TABLE cash_register_time_trial_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  best_levels INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, duration_seconds)
);

-- Enable RLS
ALTER TABLE cash_register_time_trial_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_time_trial_bests ENABLE ROW LEVEL SECURITY;

-- RLS policies for scores
CREATE POLICY "Users can view all time trial scores"
  ON cash_register_time_trial_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own scores"
  ON cash_register_time_trial_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for bests
CREATE POLICY "Users can view all time trial bests"
  ON cash_register_time_trial_bests FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own bests"
  ON cash_register_time_trial_bests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bests"
  ON cash_register_time_trial_bests FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_time_trial_scores_user ON cash_register_time_trial_scores(user_id);
CREATE INDEX idx_time_trial_scores_duration ON cash_register_time_trial_scores(duration_seconds);
CREATE INDEX idx_time_trial_bests_user ON cash_register_time_trial_bests(user_id);
CREATE INDEX idx_time_trial_bests_duration_levels ON cash_register_time_trial_bests(duration_seconds, best_levels DESC);