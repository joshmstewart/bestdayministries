-- Delete incorrectly formatted receipts (old format: 2025-XXXXXX)
-- These were created with the old receipt number format before the RCP- standard was implemented
DELETE FROM public.sponsorship_receipts 
WHERE receipt_number LIKE '2025-%' 
  OR receipt_number LIKE '2024-%';