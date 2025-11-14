-- Phase 1 Revised: Link only the closest matching receipt to each donation
-- Use window functions to rank receipts by proximity to donation creation time

WITH ranked_matches AS (
  SELECT 
    sr.id as receipt_id,
    d.id as donation_id,
    ROW_NUMBER() OVER (
      PARTITION BY d.id 
      ORDER BY ABS(EXTRACT(EPOCH FROM (sr.created_at - d.created_at))) ASC
    ) as rn
  FROM sponsorship_receipts sr
  JOIN donations d ON (
    (sr.sponsor_email IS NOT NULL AND sr.sponsor_email = d.donor_email)
    OR (sr.user_id IS NOT NULL AND sr.user_id = d.donor_id)
  )
  WHERE sr.sponsorship_id IS NULL
    AND sr.amount = d.amount
    AND sr.stripe_mode = d.stripe_mode
    AND ABS(EXTRACT(EPOCH FROM (sr.created_at - d.created_at))) < 3600
    AND sr.transaction_id NOT LIKE 'donation_%'
)
UPDATE sponsorship_receipts
SET transaction_id = 'donation_' || rm.donation_id::text
FROM ranked_matches rm
WHERE sponsorship_receipts.id = rm.receipt_id
  AND rm.rn = 1;