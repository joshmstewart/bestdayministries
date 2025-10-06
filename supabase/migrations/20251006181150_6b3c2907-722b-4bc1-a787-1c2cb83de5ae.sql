-- Create or replace view that calculates funding progress by Stripe mode
DROP VIEW IF EXISTS public.sponsor_bestie_funding_progress_by_mode CASCADE;

CREATE VIEW public.sponsor_bestie_funding_progress_by_mode AS
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
FROM 
  public.sponsor_besties sb
LEFT JOIN 
  public.sponsorships s ON s.sponsor_bestie_id = sb.id
WHERE 
  sb.is_active = true
GROUP BY 
  sb.id, sb.bestie_name, sb.monthly_goal, s.stripe_mode;