
CREATE TABLE public.e2e_test_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  overall_status text NOT NULL DEFAULT 'running',
  test_type text NOT NULL DEFAULT 'marketplace',
  vendor_id uuid,
  product_id uuid,
  order_id uuid,
  test_user_email text,
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.e2e_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view e2e_test_runs"
ON public.e2e_test_runs
FOR SELECT
TO authenticated
USING (public.is_admin_or_owner());

CREATE POLICY "Admins insert e2e_test_runs"
ON public.e2e_test_runs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "Admins update e2e_test_runs"
ON public.e2e_test_runs
FOR UPDATE
TO authenticated
USING (public.is_admin_or_owner());

CREATE POLICY "Admins delete e2e_test_runs"
ON public.e2e_test_runs
FOR DELETE
TO authenticated
USING (public.is_admin_or_owner());

CREATE INDEX idx_e2e_test_runs_started_at ON public.e2e_test_runs (started_at DESC);
