-- Create a new view that groups funding progress by both bestie AND stripe mode
DROP VIEW IF EXISTS public.sponsor_bestie_funding_progress_by_mode;

CREATE OR REPLACE VIEW public.sponsor_bestie_funding_progress_by_mode AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  s.stripe_mode,
  COALESCE(SUM(
    CASE 
      WHEN s.frequency = 'monthly' 
        AND s.status = 'active'
      THEN s.amount 
      ELSE 0 
    END
  ), 0) AS current_monthly_pledges,
  sb.monthly_goal,
  CASE 
    WHEN sb.monthly_goal > 0 
    THEN ROUND((COALESCE(SUM(
      CASE 
        WHEN s.frequency = 'monthly' 
          AND s.status = 'active'
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
        WHEN s.frequency = 'monthly' 
          AND s.status = 'active'
        THEN s.amount 
        ELSE 0 
      END
    ), 0))
    ELSE 0 
  END AS remaining_needed
FROM public.sponsor_besties sb
LEFT JOIN public.sponsorships s ON s.sponsor_bestie_id = sb.id
WHERE sb.is_active = true
GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal, s.stripe_mode;

-- Also keep the old view for backward compatibility, but remove the mode filter
DROP VIEW IF EXISTS public.sponsor_bestie_funding_progress;

CREATE OR REPLACE VIEW public.sponsor_bestie_funding_progress AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  COALESCE(SUM(
    CASE 
      WHEN s.frequency = 'monthly' 
        AND s.status = 'active'
      THEN s.amount 
      ELSE 0 
    END
  ), 0) AS current_monthly_pledges,
  sb.monthly_goal,
  CASE 
    WHEN sb.monthly_goal > 0 
    THEN ROUND((COALESCE(SUM(
      CASE 
        WHEN s.frequency = 'monthly' 
          AND s.status = 'active'
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
        WHEN s.frequency = 'monthly' 
          AND s.status = 'active'
        THEN s.amount 
        ELSE 0 
      END
    ), 0))
    ELSE 0 
  END AS remaining_needed
FROM public.sponsor_besties sb
LEFT JOIN public.sponsorships s ON s.sponsor_bestie_id = sb.id
WHERE sb.is_active = true
GROUP BY sb.id, sb.bestie_id, sb.bestie_name, sb.monthly_goal;