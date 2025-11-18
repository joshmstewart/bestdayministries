-- Add stripe_checkout_session_id column to donations table for unique tracking
ALTER TABLE donations ADD COLUMN stripe_checkout_session_id TEXT;

-- Add index for fast webhook lookups
CREATE INDEX idx_donations_checkout_session 
ON donations(stripe_checkout_session_id) 
WHERE stripe_checkout_session_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN donations.stripe_checkout_session_id IS 'Unique Stripe Checkout Session ID for matching webhook events to donation records';
