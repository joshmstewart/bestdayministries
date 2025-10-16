-- Add target audience configuration to newsletter campaigns
ALTER TABLE newsletter_campaigns
ADD COLUMN target_audience jsonb DEFAULT '{"type": "all"}'::jsonb;

COMMENT ON COLUMN newsletter_campaigns.target_audience IS 'Audience targeting configuration: {"type": "all"} or {"type": "roles", "roles": ["supporter", "bestie", "caregiver"]}';
