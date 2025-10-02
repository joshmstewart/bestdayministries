-- Add is_fully_funded column to featured_besties table
ALTER TABLE public.featured_besties 
ADD COLUMN is_fully_funded BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.featured_besties.is_fully_funded IS 'Whether this bestie has received enough sponsorships and should not appear as available on the sponsorship page. Separate from available_for_sponsorship which controls overall eligibility.';