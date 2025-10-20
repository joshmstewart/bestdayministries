-- Remove overly permissive RLS policies that expose sensitive donor information
-- These policies allowed anonymous and authenticated users to query individual sponsorship records
-- The proper approach is to use the bestie_funding_progress and sponsor_bestie_funding_progress_by_mode views
-- which aggregate amounts without exposing individual sponsor information

-- Drop the anonymous user policy added on 2025-10-20
DROP POLICY IF EXISTS "Anonymous users can view sponsorships for funding display" ON public.sponsorships;

-- Drop the authenticated user policy added on 2025-10-20
DROP POLICY IF EXISTS "Authenticated users can view sponsorships for funding display" ON public.sponsorships;

-- Note: Frontend components (SponsorBestieDisplay.tsx and FeaturedBestieDisplay.tsx) 
-- already use the aggregated views and do not need changes.
-- The views properly aggregate funding totals without exposing:
-- - sponsor_id
-- - individual donation amounts  
-- - stripe_subscription_id
-- - other sensitive payment metadata