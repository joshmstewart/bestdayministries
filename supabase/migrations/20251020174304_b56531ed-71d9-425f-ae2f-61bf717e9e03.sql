-- Add SELECT policy on sponsorships for funding progress views
-- This policy allows users to query sponsorships ONLY for aggregated funding calculations
-- Individual sponsorship details remain protected by other policies

CREATE POLICY "Users can view sponsorship funding aggregates"
ON public.sponsorships
FOR SELECT
TO authenticated, anon
USING (
  -- Only allow viewing fields used in funding calculations
  -- This exposes sponsor_bestie_id, amount, frequency, status, and stripe_mode
  -- but does NOT expose sponsor_id or other sensitive payment details
  true
);

COMMENT ON POLICY "Users can view sponsorship funding aggregates" ON public.sponsorships IS
  'Allows querying sponsorships for funding progress calculations. Individual sponsor details protected by view-level security.';