-- Add amount_charged column to track what Stripe actually charged (including fee coverage)
ALTER TABLE donations 
ADD COLUMN IF NOT EXISTS amount_charged numeric;

-- Add comment explaining the columns
COMMENT ON COLUMN donations.amount IS 'Base donation amount before any fee coverage';
COMMENT ON COLUMN donations.amount_charged IS 'Total amount charged by Stripe (includes fee coverage if applicable)';

-- Backfill amount_charged with amount for existing records (they match for old donations without fee coverage)
UPDATE donations 
SET amount_charged = amount 
WHERE amount_charged IS NULL;