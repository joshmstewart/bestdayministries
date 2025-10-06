-- Add is_public column to sponsor_besties table
ALTER TABLE public.sponsor_besties 
ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX idx_sponsor_besties_is_public ON public.sponsor_besties(is_public);