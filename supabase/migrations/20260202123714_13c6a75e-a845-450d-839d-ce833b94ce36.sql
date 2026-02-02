-- Create table to track compression job progress
CREATE TABLE IF NOT EXISTS public.avatar_compression_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_images INTEGER NOT NULL DEFAULT 0,
  already_compressed INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  current_image_id UUID NULL,
  error_messages JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.avatar_compression_jobs ENABLE ROW LEVEL SECURITY;

-- Admins only policy
CREATE POLICY "Admins can manage compression jobs"
  ON public.avatar_compression_jobs
  FOR ALL
  USING (public.is_admin_or_owner())
  WITH CHECK (public.is_admin_or_owner());