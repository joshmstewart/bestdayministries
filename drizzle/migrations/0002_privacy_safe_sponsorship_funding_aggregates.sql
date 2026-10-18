CREATE OR REPLACE FUNCTION public.get_sponsorship_funding_totals(p_bestie_ids uuid[] DEFAULT NULL)
RETURNS TABLE(sponsor_bestie_id uuid, stripe_mode text, current_monthly_pledges numeric, stable_amount numeric, ending_amount numeric, monthly_goal numeric, funding_percentage numeric, remaining_needed numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
WITH eligible AS (
 SELECT sb.id, sb.monthly_goal FROM public.sponsor_besties sb
 WHERE sb.is_active = true
 AND (sb.is_public = true OR public.has_admin_access(auth.uid()) OR EXISTS (SELECT 1 FROM public.caregiver_bestie_links l WHERE l.bestie_id=sb.bestie_id AND l.caregiver_id=auth.uid()))
 AND (p_bestie_ids IS NULL OR (cardinality(p_bestie_ids)<=200 AND sb.id=ANY(p_bestie_ids)))
), totals AS (
 SELECT e.id, s.stripe_mode, e.monthly_goal,
 COALESCE(SUM(CASE WHEN s.status='active' AND (s.frequency='monthly' OR (s.frequency='one-time' AND (s.ended_at IS NULL OR s.ended_at>now()))) THEN s.amount ELSE 0 END),0) AS current_amount,
 COALESCE(SUM(CASE WHEN s.status='active' AND (s.frequency='monthly' OR (s.frequency='one-time' AND (s.ended_at IS NULL OR s.ended_at<=now()))) THEN s.amount ELSE 0 END),0) AS stable,
 COALESCE(SUM(CASE WHEN s.status='active' AND s.frequency='one-time' AND s.ended_at>now() THEN s.amount ELSE 0 END),0) AS ending
 FROM eligible e LEFT JOIN public.sponsorships s ON s.sponsor_bestie_id=e.id
 GROUP BY e.id,e.monthly_goal,s.stripe_mode
)
SELECT id,stripe_mode,current_amount,stable,ending,monthly_goal,
 CASE WHEN monthly_goal>0 THEN round(current_amount/monthly_goal*100,2) ELSE 0 END,
 CASE WHEN monthly_goal>0 THEN greatest(0,monthly_goal-current_amount) ELSE 0 END FROM totals;
$$;
REVOKE ALL ON FUNCTION public.get_sponsorship_funding_totals(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sponsorship_funding_totals(uuid[]) TO anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_sponsorship_funding_totals(uuid[]) IS 'Aggregate-only funding reads; never returns donor or Stripe fields. Existing total and stable/ending semantics preserved.';
CREATE OR REPLACE FUNCTION public.get_featured_bestie_funding_totals()
RETURNS TABLE(featured_bestie_id uuid,bestie_id uuid,bestie_name text,monthly_goal numeric,current_monthly_pledges numeric,remaining_needed numeric,funding_percentage numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT fb.id,fb.bestie_id,fb.bestie_name,fb.monthly_goal,COALESCE(sum(s.amount),0),greatest(fb.monthly_goal-COALESCE(sum(s.amount),0),0),CASE WHEN fb.monthly_goal>0 THEN least(round(COALESCE(sum(s.amount),0)/fb.monthly_goal*100,2),100) ELSE 0 END
FROM public.featured_besties fb LEFT JOIN public.sponsorships s ON s.bestie_id=fb.bestie_id AND s.status='active' AND s.frequency='monthly'
GROUP BY fb.id,fb.bestie_id,fb.bestie_name,fb.monthly_goal;
$$;
REVOKE ALL ON FUNCTION public.get_featured_bestie_funding_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_featured_bestie_funding_totals() TO anon,authenticated,service_role;
CREATE OR REPLACE VIEW public.bestie_funding_progress WITH (security_invoker=true) AS SELECT featured_bestie_id,bestie_id,bestie_name,monthly_goal::numeric(10,2),current_monthly_pledges,remaining_needed,funding_percentage FROM public.get_featured_bestie_funding_totals();
GRANT SELECT ON public.bestie_funding_progress TO anon,authenticated,service_role;