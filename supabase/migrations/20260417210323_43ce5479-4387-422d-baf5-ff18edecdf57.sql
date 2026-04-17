CREATE TABLE IF NOT EXISTS public.noj_confirmation_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  recipient_email TEXT NOT NULL,
  contact_name TEXT,
  ticket_items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  resend_email_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.noj_confirmation_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view NOJ email log"
ON public.noj_confirmation_email_log
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin'::public.user_role, 'owner'::public.user_role));

CREATE INDEX IF NOT EXISTS idx_noj_email_log_recipient ON public.noj_confirmation_email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_noj_email_log_sent_at ON public.noj_confirmation_email_log(sent_at DESC);