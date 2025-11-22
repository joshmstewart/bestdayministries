-- Phase 2: Add unique constraints to prevent donation/sponsorship duplicates

-- Add unique constraint on donations.stripe_subscription_id (NULL values allowed, non-NULL must be unique)
CREATE UNIQUE INDEX donations_stripe_subscription_id_unique 
ON donations (stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- Add unique constraint on donations.stripe_payment_intent_id (NULL values allowed, non-NULL must be unique)
CREATE UNIQUE INDEX donations_stripe_payment_intent_id_unique 
ON donations (stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Add unique constraint on donations.stripe_checkout_session_id (NULL values allowed, non-NULL must be unique)
CREATE UNIQUE INDEX donations_stripe_checkout_session_id_unique 
ON donations (stripe_checkout_session_id) 
WHERE stripe_checkout_session_id IS NOT NULL;

-- Add comment explaining the constraints
COMMENT ON INDEX donations_stripe_subscription_id_unique IS 
'Prevents duplicate donation records for the same Stripe subscription - ensures one-to-one mapping between Stripe subscriptions and donation records';

COMMENT ON INDEX donations_stripe_payment_intent_id_unique IS 
'Prevents duplicate donation records for the same Stripe payment intent - ensures one-to-one mapping between Stripe payments and donation records';

COMMENT ON INDEX donations_stripe_checkout_session_id_unique IS 
'Prevents duplicate donation records for the same checkout session - prevents race conditions during checkout processing';