-- Add show_vendor_link column to caregiver_bestie_links
ALTER TABLE public.caregiver_bestie_links
ADD COLUMN show_vendor_link boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.caregiver_bestie_links.show_vendor_link IS 'Controls whether vendor store link appears on bestie profile displays';