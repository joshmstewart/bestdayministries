-- Create saved_shopping_tips table to persist expansion suggestions
CREATE TABLE public.saved_shopping_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  ingredient_tips JSONB DEFAULT '[]',
  tool_tips JSONB DEFAULT '[]',
  last_generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_shopping_tips ENABLE ROW LEVEL SECURITY;

-- Users can view their own tips
CREATE POLICY "Users can view own shopping tips"
  ON public.saved_shopping_tips
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tips
CREATE POLICY "Users can insert own shopping tips"
  ON public.saved_shopping_tips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tips
CREATE POLICY "Users can update own shopping tips"
  ON public.saved_shopping_tips
  FOR UPDATE
  USING (auth.uid() = user_id);