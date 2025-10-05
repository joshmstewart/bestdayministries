-- Fix the sponsor_bestie_funding_progress view by removing quotes from the extracted stripe_mode
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
        AND s.stripe_mode = TRIM(BOTH '"' FROM (SELECT setting_value#>>'{}' FROM app_settings WHERE setting_key = 'stripe_mode'))
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
          AND s.stripe_mode = TRIM(BOTH '"' FROM (SELECT setting_value#>>'{}' FROM app_settings WHERE setting_key = 'stripe_mode'))
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
          AND s.stripe_mode = TRIM(BOTH '"' FROM (SELECT setting_value#>>'{}' FROM app_settings WHERE setting_key = 'stripe_mode'))
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