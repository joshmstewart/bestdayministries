-- Add stripe_mode column to sponsorship_receipts table
ALTER TABLE sponsorship_receipts 
ADD COLUMN IF NOT EXISTS stripe_mode TEXT NOT NULL DEFAULT 'live';