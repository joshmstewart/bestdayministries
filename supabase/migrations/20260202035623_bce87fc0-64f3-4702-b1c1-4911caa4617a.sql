-- Create table to store weekly AI summaries
CREATE TABLE public.mood_weekly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  summary TEXT NOT NULL,
  mood_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.mood_weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only view their own summaries
CREATE POLICY "Users can view own summaries" 
ON public.mood_weekly_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own summaries
CREATE POLICY "Users can insert own summaries" 
ON public.mood_weekly_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own summaries
CREATE POLICY "Users can update own summaries" 
ON public.mood_weekly_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_mood_weekly_summaries_user_week 
ON public.mood_weekly_summaries(user_id, week_start DESC);