-- Phase 1: Add indexes for faster feed queries (corrected column names)
CREATE INDEX IF NOT EXISTS idx_beat_pad_creations_public_created 
  ON beat_pad_creations(created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_user_colorings_public_created 
  ON user_colorings(created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_events_public_created 
  ON events(created_at DESC) WHERE is_active = true AND is_public = true;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_public_created 
  ON prayer_requests(created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_custom_drinks_public_created 
  ON custom_drinks(created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_content_announcements_created 
  ON content_announcements(created_at DESC);