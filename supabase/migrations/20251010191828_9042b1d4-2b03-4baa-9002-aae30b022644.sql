-- Create test runs table
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failure', 'cancelled')),
  workflow_name TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  branch TEXT NOT NULL,
  run_id TEXT NOT NULL,
  run_url TEXT NOT NULL,
  duration_seconds INTEGER,
  test_count INTEGER,
  passed_count INTEGER,
  failed_count INTEGER,
  skipped_count INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

-- Admins can view all test runs
CREATE POLICY "Admins can view all test runs"
  ON public.test_runs
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Service role can insert test runs (for webhook)
CREATE POLICY "Service can insert test runs"
  ON public.test_runs
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON public.test_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON public.test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_branch ON public.test_runs(branch);