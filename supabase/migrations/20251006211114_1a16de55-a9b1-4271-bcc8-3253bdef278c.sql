-- Create audit log table for receipt generation stages
CREATE TABLE IF NOT EXISTS public.receipt_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id uuid REFERENCES public.sponsorships(id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES public.sponsorship_receipts(id) ON DELETE SET NULL,
  stage text NOT NULL, -- e.g., 'webhook_received', 'email_sent', 'database_insert', 'stripe_lookup'
  status text NOT NULL, -- 'success' or 'failure'
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipt_logs_sponsorship ON public.receipt_generation_logs(sponsorship_id);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_receipt ON public.receipt_generation_logs(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_created ON public.receipt_generation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_status ON public.receipt_generation_logs(status);

-- RLS policies
ALTER TABLE public.receipt_generation_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all receipt logs"
ON public.receipt_generation_logs
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Users can view logs for their own sponsorships
CREATE POLICY "Users can view their own receipt logs"
ON public.receipt_generation_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sponsorships s
    WHERE s.id = receipt_generation_logs.sponsorship_id
    AND (s.sponsor_id = auth.uid() OR s.sponsor_email = get_user_email(auth.uid()))
  )
);

COMMENT ON TABLE public.receipt_generation_logs IS 'Audit log tracking each stage of receipt generation process';
COMMENT ON COLUMN public.receipt_generation_logs.stage IS 'Stage name: webhook_received, stripe_lookup, email_sent, database_insert, etc';
COMMENT ON COLUMN public.receipt_generation_logs.status IS 'success or failure';
COMMENT ON COLUMN public.receipt_generation_logs.metadata IS 'Additional context like email ID, Stripe event type, etc';