-- Create table to track jokes users have seen
CREATE TABLE public.user_joke_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  joke_question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on user_id + joke_question to prevent duplicates
CREATE UNIQUE INDEX idx_user_joke_history_unique ON public.user_joke_history (user_id, joke_question);

-- Create index for faster lookups
CREATE INDEX idx_user_joke_history_user_id ON public.user_joke_history (user_id);

-- Enable RLS
ALTER TABLE public.user_joke_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view their own joke history"
ON public.user_joke_history FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert their own joke history"
ON public.user_joke_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history (for clearing)
CREATE POLICY "Users can delete their own joke history"
ON public.user_joke_history FOR DELETE
USING (auth.uid() = user_id);