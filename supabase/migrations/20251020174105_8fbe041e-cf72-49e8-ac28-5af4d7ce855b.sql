-- Grant SELECT permissions on funding progress views to all users
-- These views aggregate sponsorship data without exposing sensitive information

GRANT SELECT ON public.sponsor_bestie_funding_progress_by_mode TO authenticated, anon;
GRANT SELECT ON public.sponsor_bestie_funding_progress TO authenticated, anon;

-- Ensure the views are accessible with security_invoker
COMMENT ON VIEW public.sponsor_bestie_funding_progress_by_mode IS 
  'Calculates funding progress by Stripe mode. Aggregates amounts without exposing individual sponsor data.';

COMMENT ON VIEW public.sponsor_bestie_funding_progress IS 
  'Calculates overall funding progress across all modes. Aggregates amounts without exposing individual sponsor data.';