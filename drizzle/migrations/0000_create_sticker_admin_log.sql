CREATE TABLE public.sticker_admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  collection_id UUID,
  sticker_id UUID,
  detail JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.sticker_admin_log TO service_role;
ALTER TABLE public.sticker_admin_log ENABLE ROW LEVEL SECURITY;