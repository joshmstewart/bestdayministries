-- Create table to track when users view/reveal their daily fortune
CREATE TABLE public.daily_fortune_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fortune_post_id UUID NOT NULL REFERENCES public.daily_fortune_posts(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one view per user per day
CREATE UNIQUE INDEX daily_fortune_views_user_date_unique ON public.daily_fortune_views(user_id, view_date);

-- Enable RLS
ALTER TABLE public.daily_fortune_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own views
CREATE POLICY "Users can view own fortune views"
ON public.daily_fortune_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own views
CREATE POLICY "Users can insert own fortune views"
ON public.daily_fortune_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for efficient lookups
CREATE INDEX idx_daily_fortune_views_user_date ON public.daily_fortune_views(user_id, view_date);