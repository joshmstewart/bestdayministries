-- Create page_visits table for tracking all page views
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT NOT NULL,
  page_title TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_page_visits_page_url ON public.page_visits(page_url);
CREATE INDEX idx_page_visits_visited_at ON public.page_visits(visited_at DESC);
CREATE INDEX idx_page_visits_user_id ON public.page_visits(user_id);
CREATE INDEX idx_page_visits_page_url_visited_at ON public.page_visits(page_url, visited_at DESC);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for guest tracking)
CREATE POLICY "Anyone can log page visits"
ON public.page_visits FOR INSERT
WITH CHECK (true);

-- Only admins can view page visits
CREATE POLICY "Admins can view page visits"
ON public.page_visits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Create a view for daily page stats (easier querying)
CREATE OR REPLACE VIEW public.page_visit_stats AS
SELECT 
  page_url,
  DATE(visited_at) as visit_date,
  COUNT(*) as visit_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM public.page_visits
GROUP BY page_url, DATE(visited_at)
ORDER BY visit_date DESC;