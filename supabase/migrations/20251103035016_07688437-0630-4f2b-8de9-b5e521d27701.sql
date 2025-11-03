-- Clean up duplicate receipt records before adding unique constraint
-- Keep only the oldest receipt for each transaction_id

DELETE FROM sponsorship_receipts a
USING sponsorship_receipts b
WHERE a.id > b.id 
  AND a.transaction_id = b.transaction_id;

-- Now add unique constraint to prevent future duplicates
ALTER TABLE sponsorship_receipts 
ADD CONSTRAINT unique_transaction_id UNIQUE (transaction_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sponsorship_receipts_transaction 
ON sponsorship_receipts(transaction_id);