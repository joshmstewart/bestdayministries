-- Add monthly_goal to featured_besties table
ALTER TABLE public.featured_besties
ADD COLUMN monthly_goal numeric(10,2) DEFAULT 0;

-- Create a view to calculate total monthly pledges per bestie
CREATE OR REPLACE VIEW public.bestie_funding_progress AS
SELECT 
  fb.id as featured_bestie_id,
  fb.bestie_id,
  fb.bestie_name,
  fb.monthly_goal,
  COALESCE(SUM(
    CASE 
      WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
      WHEN s.frequency = 'yearly' AND s.status = 'active' THEN s.amount / 12
      ELSE 0
    END
  ), 0) as current_monthly_pledges,
  fb.monthly_goal - COALESCE(SUM(
    CASE 
      WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
      WHEN s.frequency = 'yearly' AND s.status = 'active' THEN s.amount / 12
      ELSE 0
    END
  ), 0) as remaining_needed,
  CASE 
    WHEN fb.monthly_goal > 0 THEN 
      LEAST(100, (COALESCE(SUM(
        CASE 
          WHEN s.frequency = 'monthly' AND s.status = 'active' THEN s.amount
          WHEN s.frequency = 'yearly' AND s.status = 'active' THEN s.amount / 12
          ELSE 0
        END
      ), 0) / fb.monthly_goal * 100))
    ELSE 0
  END as funding_percentage
FROM public.featured_besties fb
LEFT JOIN public.sponsorships s ON fb.bestie_id = s.bestie_id
WHERE fb.available_for_sponsorship = true
GROUP BY fb.id, fb.bestie_id, fb.bestie_name, fb.monthly_goal;

-- Grant access to the view
GRANT SELECT ON public.bestie_funding_progress TO authenticated;
GRANT SELECT ON public.bestie_funding_progress TO anon;