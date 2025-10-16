
-- Add unique constraint on stripe_subscription_id to prevent duplicate subscriptions
ALTER TABLE sponsorships 
ADD CONSTRAINT sponsorships_stripe_subscription_id_unique 
UNIQUE (stripe_subscription_id);
