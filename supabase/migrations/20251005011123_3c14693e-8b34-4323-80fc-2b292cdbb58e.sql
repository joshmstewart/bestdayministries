-- Make bestie_id nullable in sponsorships table and adjust foreign key constraint
ALTER TABLE public.sponsorships 
ALTER COLUMN bestie_id DROP NOT NULL;

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.sponsorships 
DROP CONSTRAINT IF EXISTS sponsorships_bestie_id_fkey;

-- Add new foreign key constraint that allows null values
ALTER TABLE public.sponsorships 
ADD CONSTRAINT sponsorships_bestie_id_fkey 
FOREIGN KEY (bestie_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;