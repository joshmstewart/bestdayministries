-- Split show_vendor_link into separate controls for bestie and guardian
-- First, add the two new columns with default true (matching current behavior)
ALTER TABLE public.caregiver_bestie_links
ADD COLUMN show_vendor_link_on_bestie boolean NOT NULL DEFAULT true,
ADD COLUMN show_vendor_link_on_guardian boolean NOT NULL DEFAULT true;

-- Copy existing show_vendor_link value to both new columns
UPDATE public.caregiver_bestie_links
SET show_vendor_link_on_bestie = show_vendor_link,
    show_vendor_link_on_guardian = show_vendor_link;

-- Drop the old column
ALTER TABLE public.caregiver_bestie_links
DROP COLUMN show_vendor_link;

COMMENT ON COLUMN public.caregiver_bestie_links.show_vendor_link_on_bestie IS 'Controls whether vendor store link appears on bestie profile displays';
COMMENT ON COLUMN public.caregiver_bestie_links.show_vendor_link_on_guardian IS 'Controls whether vendor store link appears on guardian profile displays';