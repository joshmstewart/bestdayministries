-- Create table for tracking tab/button clicks
CREATE TABLE public.tab_click_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tab_name TEXT NOT NULL,
  page_url TEXT NOT NULL,
  session_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tab_click_tracking ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own clicks
CREATE POLICY "Users can insert their own tab clicks"
ON public.tab_click_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all clicks
CREATE POLICY "Admins can view all tab clicks"
ON public.tab_click_tracking
FOR SELECT
USING (public.is_admin_or_owner());

-- Create index for efficient querying
CREATE INDEX idx_tab_click_tracking_tab_name ON public.tab_click_tracking(tab_name);
CREATE INDEX idx_tab_click_tracking_created_at ON public.tab_click_tracking(created_at DESC);