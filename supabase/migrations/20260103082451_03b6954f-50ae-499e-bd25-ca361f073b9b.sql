-- Add designation column to donation_stripe_transactions
ALTER TABLE donation_stripe_transactions 
ADD COLUMN designation text DEFAULT 'General Support';