-- Create reconciliation_job_logs table
CREATE TABLE IF NOT EXISTS reconciliation_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stripe_mode TEXT NOT NULL,
  triggered_by TEXT,
  checked_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'success',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create reconciliation_changes table
CREATE TABLE IF NOT EXISTS reconciliation_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_log_id UUID NOT NULL REFERENCES reconciliation_job_logs(id) ON DELETE CASCADE,
  sponsorship_id UUID REFERENCES sponsorships(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_job_logs_job_name ON reconciliation_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_reconciliation_job_logs_ran_at ON reconciliation_job_logs(ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_changes_job_log_id ON reconciliation_changes(job_log_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_changes_sponsorship_id ON reconciliation_changes(sponsorship_id);

-- Enable RLS
ALTER TABLE reconciliation_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin-only access
CREATE POLICY "Admins can view job logs" ON reconciliation_job_logs
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can view changes" ON reconciliation_changes
  FOR SELECT USING (has_admin_access(auth.uid()));