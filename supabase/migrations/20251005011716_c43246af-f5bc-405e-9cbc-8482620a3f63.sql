-- Add sponsor_bestie_id to track which sponsor_bestie is being sponsored
ALTER TABLE public.sponsorships 
ADD COLUMN sponsor_bestie_id uuid REFERENCES public.sponsor_besties(id) ON DELETE CASCADE;

-- Drop the old unique constraint
ALTER TABLE public.sponsorships 
DROP CONSTRAINT IF EXISTS sponsorships_sponsor_bestie_unique;

-- Add new unique constraint on sponsor_id and sponsor_bestie_id
ALTER TABLE public.sponsorships 
ADD CONSTRAINT sponsorships_sponsor_bestie_unique 
UNIQUE (sponsor_id, sponsor_bestie_id);