-- Fix security definer view warning
-- Recreate sponsor_bestie_funding_progress_by_mode without using SECURITY DEFINER function
-- Instead, use direct SQL with security_invoker = true

DROP VIEW IF EXISTS public.sponsor_bestie_funding_progress_by_mode CASCADE;

-- Recreate the view with SECURITY INVOKER (respects RLS of querying user)
-- The underlying tables sponsor_besties and sponsorships have appropriate RLS policies
CREATE VIEW public.sponsor_bestie_funding_progress_by_mode
WITH (security_invoker = true)
AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  sb.monthly_goal,
  s.stripe_mode,
  COALESCE(SUM(
    CASE 
      WHEN s.status = 'active' AND s.frequency = 'monthly' THEN s.amount
      WHEN s.status = 'active' AND s.frequency = 'one-time' 
           AND (s.ended_at IS NULL OR s.ended_at > NOW()) THEN s.amount
      ELSE 0 
    END
  ), 0) AS current_monthly_pledges,
  CASE 
    WHEN sb.monthly_goal > 0 THEN 
      ROUND((COALESCE(SUM(
        CASE 
          WHEN s.status = 'active' AND s.frequency = 'monthly' THEN s.amount
          WHEN s.status = 'active' AND s.frequency = 'one-time' 
               AND (s.ended_at IS NULL OR s.ended_at > NOW()) THEN s.amount
          ELSE 0 
        END
      ), 0) / sb.monthly_goal) * 100, 2)
    ELSE 0 
  END AS funding_percentage,
  CASE 
    WHEN sb.monthly_goal > 0 THEN 
      GREATEST(0, sb.monthly_goal - COALESCE(SUM(
        CASE 
          WHEN s.status = 'active' AND s.frequency = 'monthly' THEN s.amount
          WHEN s.status = 'active' AND s.frequency = 'one-time' 
               AND (s.ended_at IS NULL OR s.ended_at > NOW()) THEN s.amount
          ELSE 0 
        END
      ), 0))
    ELSE 0 
  END AS remaining_needed
FROM public.sponsor_besties sb
LEFT JOIN public.sponsorships s ON sb.id = s.sponsor_bestie_id
WHERE sb.is_active = true AND sb.is_public = true
GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal, s.stripe_mode;

-- Grant SELECT to all users (public funding data is meant to be visible)
GRANT SELECT ON public.sponsor_bestie_funding_progress_by_mode TO authenticated, anon;

COMMENT ON VIEW public.sponsor_bestie_funding_progress_by_mode IS 
  'Calculates funding progress by Stripe mode with SECURITY INVOKER. Aggregates amounts without exposing individual sponsor data. RLS on sponsorships controls access.';