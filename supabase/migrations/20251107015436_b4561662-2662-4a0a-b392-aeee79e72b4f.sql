-- Update the funding progress function to include one-time sponsorships that haven't expired yet
CREATE OR REPLACE FUNCTION public.get_sponsor_bestie_funding_progress()
 RETURNS TABLE(sponsor_bestie_id uuid, bestie_id uuid, bestie_name text, current_monthly_pledges numeric, monthly_goal numeric, funding_percentage numeric, remaining_needed numeric, stripe_mode text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    sb.id AS sponsor_bestie_id,
    sb.bestie_id,
    sb.bestie_name,
    COALESCE(SUM(
      CASE 
        -- Include monthly sponsorships that are active
        WHEN s.frequency = 'monthly' AND s.status = 'active' 
        THEN s.amount
        -- Include one-time sponsorships that haven't expired yet
        WHEN s.frequency = 'one-time' AND s.status = 'active' 
             AND (s.ended_at IS NULL OR s.ended_at > now())
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
          WHEN s.frequency = 'one-time' AND s.status = 'active' 
               AND (s.ended_at IS NULL OR s.ended_at > now())
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
          WHEN s.frequency = 'one-time' AND s.status = 'active' 
               AND (s.ended_at IS NULL OR s.ended_at > now())
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
$function$;