
-- Table to store health check results and track alert state
CREATE TABLE public.health_check_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scope TEXT NOT NULL DEFAULT 'critical',
  total_checked INTEGER NOT NULL DEFAULT 0,
  alive_count INTEGER NOT NULL DEFAULT 0,
  slow_count INTEGER NOT NULL DEFAULT 0,
  dead_count INTEGER NOT NULL DEFAULT 0,
  dead_critical_count INTEGER NOT NULL DEFAULT 0,
  dead_functions JSONB NOT NULL DEFAULT '[]'::jsonb,
  all_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  alert_sent BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.health_check_results ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view health check results"
  ON public.health_check_results FOR SELECT
  USING (public.is_admin_or_owner());

-- Service role inserts (edge function uses service key)
-- No INSERT policy needed since edge function uses service role key

-- Clean up old results (keep 7 days)
CREATE INDEX idx_health_check_results_checked_at ON public.health_check_results (checked_at DESC);

-- Enable realtime for badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_check_results;
