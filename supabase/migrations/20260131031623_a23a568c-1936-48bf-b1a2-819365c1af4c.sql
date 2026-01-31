-- Create table for user saved fortunes
CREATE TABLE public.user_saved_fortunes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fortune_post_id UUID NOT NULL REFERENCES public.daily_fortune_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, fortune_post_id)
);

-- Enable RLS
ALTER TABLE public.user_saved_fortunes ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved fortunes
CREATE POLICY "Users can view own saved fortunes"
ON public.user_saved_fortunes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save fortunes
CREATE POLICY "Users can save fortunes"
ON public.user_saved_fortunes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unsave fortunes
CREATE POLICY "Users can unsave fortunes"
ON public.user_saved_fortunes
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_user_saved_fortunes_user_id ON public.user_saved_fortunes(user_id);
CREATE INDEX idx_user_saved_fortunes_fortune_post_id ON public.user_saved_fortunes(fortune_post_id);