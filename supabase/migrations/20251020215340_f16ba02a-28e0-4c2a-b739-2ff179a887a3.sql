-- Add missing Stripe columns to sponsorships table
ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sponsorships_stripe_customer ON sponsorships(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_stripe_payment_intent ON sponsorships(stripe_payment_intent_id);