-- Add profile fields to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN vendors.logo_url IS 'URL to vendor logo image';
COMMENT ON COLUMN vendors.banner_image_url IS 'URL to vendor profile banner image';
COMMENT ON COLUMN vendors.social_links IS 'JSON object with social media links (instagram, facebook, website, etc)';

-- Create index for faster vendor profile lookups
CREATE INDEX IF NOT EXISTS idx_vendors_status_active ON vendors(status) WHERE status = 'approved';