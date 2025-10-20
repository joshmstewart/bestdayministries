-- Fix JOIN condition in get_sponsor_bestie_funding_progress function
-- Sponsorships link to sponsor_besties via sponsor_bestie_id, not bestie_id

CREATE OR REPLACE FUNCTION get_sponsor_bestie_funding_progress()
RETURNS TABLE (
  sponsor_bestie_id UUID,
  bestie_id UUID,
  bestie_name TEXT,
  current_monthly_pledges NUMERIC,
  monthly_goal NUMERIC,
  funding_percentage NUMERIC,
  remaining_needed NUMERIC,
  stripe_mode TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sb.id AS sponsor_bestie_id,
    sb.bestie_id,
    sb.bestie_name,
    COALESCE(SUM(
      CASE 
        WHEN s.frequency = 'monthly' AND s.status = 'active' 
        THEN s.amount 
        ELSE 0 
      END
    ), 0) AS current_monthly_pledges,
    sb.monthly_goal,
    CASE 
      WHEN sb.monthly_goal > 0 
      THEN ROUND((COALESCE(SUM(
        CASE 
          WHEN s.frequency = 'monthly' AND s.status = 'active' 
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
          WHEN s.frequency = 'monthly' AND s.status = 'active' 
          THEN s.amount 
          ELSE 0 
        END
      ), 0))
      ELSE 0 
    END AS remaining_needed,
    s.stripe_mode
  FROM sponsor_besties sb
  LEFT JOIN sponsorships s ON s.sponsor_bestie_id = sb.id
  WHERE sb.is_active = true
  GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal, s.stripe_mode;
END;
$$;