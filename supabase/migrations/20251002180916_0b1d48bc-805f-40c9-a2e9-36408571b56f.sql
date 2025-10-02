-- Add available_for_sponsorship column to featured_besties table
ALTER TABLE public.featured_besties 
ADD COLUMN available_for_sponsorship BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.featured_besties.available_for_sponsorship IS 'Whether this bestie is available for sponsorship. Separate from is_active which controls general visibility.';