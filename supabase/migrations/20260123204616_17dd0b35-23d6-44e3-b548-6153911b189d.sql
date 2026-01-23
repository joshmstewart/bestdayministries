-- Create marketplace reconciliation log table for visibility
CREATE TABLE IF NOT EXISTS public.marketplace_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  orders_checked INTEGER NOT NULL DEFAULT 0,
  confirmed INTEGER NOT NULL DEFAULT 0,
  cancelled INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for querying recent runs
CREATE INDEX idx_marketplace_reconciliation_log_run_at ON public.marketplace_reconciliation_log(run_at DESC);

-- RLS - admins only
ALTER TABLE public.marketplace_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reconciliation logs"
ON public.marketplace_reconciliation_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Service role can insert reconciliation logs"
ON public.marketplace_reconciliation_log
FOR INSERT
WITH CHECK (true);