-- Change sponsor_bestie_funding_progress_by_mode to use SECURITY DEFINER
-- This allows the view to run with elevated permissions so all users can see funding totals
-- Individual sponsorship details remain protected

DROP VIEW IF EXISTS public.sponsor_bestie_funding_progress_by_mode CASCADE;

CREATE VIEW public.sponsor_bestie_funding_progress_by_mode
WITH (security_invoker = false)
AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_name,
  sb.monthly_goal,
  s.stripe_mode,
  COALESCE(SUM(
    CASE 
      WHEN s.status = 'active' AND s.frequency = 'monthly' 
      THEN s.amount 
      ELSE 0 
    END
  ), 0) AS current_monthly_pledges,
  CASE 
    WHEN sb.monthly_goal > 0 
    THEN ROUND((COALESCE(SUM(
      CASE 
        WHEN s.status = 'active' AND s.frequency = 'monthly' 
        THEN s.amount 
        ELSE 0 
      END
    ), 0) / sb.monthly_goal) * 100, 2)
    ELSE 0 
  END AS funding_percentage,
  CASE 
    WHEN sb.monthly_goal > 0 
    THEN GREATEST(0, sb.monthly_goal - COALESCE(SUM(
      CASE 
        WHEN s.status = 'active' AND s.frequency = 'monthly' 
        THEN s.amount 
        ELSE 0 
      END
    ), 0))
    ELSE 0 
  END AS remaining_needed
FROM public.sponsor_besties sb
LEFT JOIN public.sponsorships s ON sb.id = s.sponsor_bestie_id
WHERE sb.is_active = true AND sb.is_public = true
GROUP BY sb.id, sb.bestie_name, sb.monthly_goal, s.stripe_mode;

-- Grant SELECT to all users
GRANT SELECT ON public.sponsor_bestie_funding_progress_by_mode TO authenticated, anon;

COMMENT ON VIEW public.sponsor_bestie_funding_progress_by_mode IS 
  'Calculates funding progress by Stripe mode with SECURITY DEFINER. Aggregates amounts without exposing individual sponsor data.';