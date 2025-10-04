-- Add column for vendor asset approval control
ALTER TABLE caregiver_bestie_links
ADD COLUMN require_vendor_asset_approval BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN caregiver_bestie_links.require_vendor_asset_approval IS 'Whether vendors need guardian approval before using bestie assets (photos, videos, etc.)';