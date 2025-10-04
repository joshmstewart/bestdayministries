-- Add sponsor link visibility columns to caregiver_bestie_links table
ALTER TABLE public.caregiver_bestie_links
ADD COLUMN IF NOT EXISTS show_sponsor_link_on_bestie BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_sponsor_link_on_guardian BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.caregiver_bestie_links.show_sponsor_link_on_bestie IS 'Whether to show sponsor page link on bestie comments (if bestie has active sponsor profile)';
COMMENT ON COLUMN public.caregiver_bestie_links.show_sponsor_link_on_guardian IS 'Whether to show sponsor page link on guardian comments (for their linked besties)';