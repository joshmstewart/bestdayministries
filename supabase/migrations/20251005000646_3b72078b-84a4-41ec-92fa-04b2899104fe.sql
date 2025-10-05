-- Add stripe_subscription_id column to sponsorships table
ALTER TABLE public.sponsorships 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;