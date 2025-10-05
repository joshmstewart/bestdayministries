-- Add unique constraint to sponsorships table for conflict resolution
ALTER TABLE public.sponsorships 
ADD CONSTRAINT sponsorships_sponsor_bestie_unique 
UNIQUE (sponsor_id, bestie_id);