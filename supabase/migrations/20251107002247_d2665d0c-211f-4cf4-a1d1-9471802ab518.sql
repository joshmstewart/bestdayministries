-- Add unique constraint on transaction_id to prevent duplicate receipts
ALTER TABLE public.sponsorship_receipts
ADD CONSTRAINT sponsorship_receipts_transaction_id_key UNIQUE (transaction_id);

-- Add index for faster lookups by transaction_id
CREATE INDEX IF NOT EXISTS idx_sponsorship_receipts_transaction_id 
ON public.sponsorship_receipts(transaction_id);