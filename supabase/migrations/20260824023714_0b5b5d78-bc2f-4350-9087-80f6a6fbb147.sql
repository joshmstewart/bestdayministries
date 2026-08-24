CREATE TABLE public.sponsor_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.sponsor_messages(id) ON DELETE CASCADE,
  sponsor_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, sponsor_id)
);

GRANT SELECT, INSERT, DELETE ON public.sponsor_message_reads TO authenticated;
GRANT ALL ON public.sponsor_message_reads TO service_role;

ALTER TABLE public.sponsor_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors view own read marks"
ON public.sponsor_message_reads FOR SELECT TO authenticated
USING (sponsor_id = auth.uid() OR public.has_admin_access(auth.uid()));

CREATE POLICY "Sponsors record own read marks"
ON public.sponsor_message_reads FOR INSERT TO authenticated
WITH CHECK (sponsor_id = auth.uid());

CREATE POLICY "Sponsors remove own read marks"
ON public.sponsor_message_reads FOR DELETE TO authenticated
USING (sponsor_id = auth.uid());

CREATE INDEX idx_sponsor_message_reads_sponsor ON public.sponsor_message_reads (sponsor_id);
CREATE INDEX idx_sponsor_message_reads_message ON public.sponsor_message_reads (message_id);

-- Backfill: messages already flagged read globally become read for every current active sponsor
INSERT INTO public.sponsor_message_reads (message_id, sponsor_id, read_at)
SELECT DISTINCT m.id, s.sponsor_id, COALESCE(m.sent_at, m.created_at)
FROM public.sponsor_messages m
JOIN public.sponsorships s ON s.bestie_id = m.bestie_id AND s.status = 'active' AND s.sponsor_id IS NOT NULL
WHERE m.is_read = true
ON CONFLICT DO NOTHING;