-- Add stripe_payment_intent_id column to donations table
-- This column stores the Stripe payment intent ID to prevent duplicate donations
-- and link donations to specific Stripe transactions
ALTER TABLE donations 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add index for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_donations_payment_intent 
ON donations(stripe_payment_intent_id, stripe_mode) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN donations.stripe_payment_intent_id IS 
'Stripe payment intent ID for this donation. Used to prevent duplicate donations and link to specific Stripe charges.';