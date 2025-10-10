-- Create change logs table
CREATE TABLE public.change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_type TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  change_details JSONB,
  affected_table TEXT,
  affected_record_id UUID
);

-- Enable RLS
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all change logs"
ON public.change_logs
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Admins can insert logs
CREATE POLICY "Admins can insert change logs"
ON public.change_logs
FOR INSERT
WITH CHECK (has_admin_access(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_change_logs_created_at ON public.change_logs(created_at DESC);
CREATE INDEX idx_change_logs_changed_by ON public.change_logs(changed_by);
CREATE INDEX idx_change_logs_change_type ON public.change_logs(change_type);