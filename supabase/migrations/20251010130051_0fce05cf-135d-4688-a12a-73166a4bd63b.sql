-- Create error_logs table for Sentry error tracking
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT NOT NULL,
  error_type TEXT,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  browser_info JSONB,
  url TEXT,
  sentry_event_id TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  environment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all error logs
CREATE POLICY "Admins can view all error logs"
ON public.error_logs
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Allow webhook to insert errors (will be handled by service role)
CREATE POLICY "Service role can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);