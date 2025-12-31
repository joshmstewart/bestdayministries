-- Add a comment explaining the scheduled_cancel status
-- No schema changes needed - status is already a text field
-- Values: active, cancelled, paused, scheduled_cancel

COMMENT ON COLUMN sponsorships.status IS 'Sponsorship status: active, cancelled, paused, scheduled_cancel (cancellation pending at period end)';