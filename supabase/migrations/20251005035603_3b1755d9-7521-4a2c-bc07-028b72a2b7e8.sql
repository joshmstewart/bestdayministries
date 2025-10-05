-- Add stripe_mode column to sponsorships table
ALTER TABLE public.sponsorships 
ADD COLUMN stripe_mode text DEFAULT 'live' CHECK (stripe_mode IN ('test', 'live'));

-- Update existing sponsorships to 'test' mode (assuming current ones are test)
UPDATE public.sponsorships SET stripe_mode = 'test';

-- Drop existing view
DROP VIEW IF EXISTS public.sponsor_bestie_funding_progress;

-- Recreate view with stripe_mode filter
CREATE OR REPLACE VIEW public.sponsor_bestie_funding_progress AS
SELECT 
  sb.id AS sponsor_bestie_id,
  sb.bestie_id,
  sb.bestie_name,
  COALESCE(SUM(
    CASE 
      WHEN s.frequency = 'monthly' 
        AND s.status = 'active' 
        AND s.stripe_mode = (SELECT setting_value->>'stripe_mode' FROM app_settings WHERE setting_key = 'stripe_mode')
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
          AND s.stripe_mode = (SELECT setting_value->>'stripe_mode' FROM app_settings WHERE setting_key = 'stripe_mode')
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
          AND s.stripe_mode = (SELECT setting_value->>'stripe_mode' FROM app_settings WHERE setting_key = 'stripe_mode')
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