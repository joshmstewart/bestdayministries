
-- Drop the old view
DROP VIEW IF EXISTS public.sponsor_bestie_funding_progress;

-- Recreate the view with correct join on sponsor_bestie_id
CREATE VIEW public.sponsor_bestie_funding_progress AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  sb.monthly_goal,
  COALESCE(
    SUM(
      CASE 
        WHEN s.frequency = 'monthly' AND s.status = 'active' 
        THEN s.amount 
        ELSE 0 
      END
    ), 0
  ) AS current_monthly_pledges,
  sb.monthly_goal - COALESCE(
    SUM(
      CASE 
        WHEN s.frequency = 'monthly' AND s.status = 'active' 
        THEN s.amount 
        ELSE 0 
      END
    ), 0
  ) AS remaining_needed,
  CASE 
    WHEN sb.monthly_goal > 0 
    THEN (
      COALESCE(
        SUM(
          CASE 
            WHEN s.frequency = 'monthly' AND s.status = 'active' 
            THEN s.amount 
            ELSE 0 
          END
        ), 0
      ) / sb.monthly_goal * 100
    )
    ELSE 0 
  END AS funding_percentage
FROM public.sponsor_besties sb
LEFT JOIN public.sponsorships s ON s.sponsor_bestie_id = sb.id
WHERE sb.is_active = true
GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal;
