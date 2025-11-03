-- Add separate receipt content fields for sponsorships and donations
ALTER TABLE receipt_settings 
  ADD COLUMN IF NOT EXISTS sponsorship_receipt_message text,
  ADD COLUMN IF NOT EXISTS sponsorship_tax_deductible_notice text,
  ADD COLUMN IF NOT EXISTS donation_receipt_message text,
  ADD COLUMN IF NOT EXISTS donation_tax_deductible_notice text;

-- Add comment explaining the separation
COMMENT ON COLUMN receipt_settings.sponsorship_receipt_message IS 'Thank you message specifically for sponsorship receipts';
COMMENT ON COLUMN receipt_settings.donation_receipt_message IS 'Thank you message specifically for donation receipts';
COMMENT ON COLUMN receipt_settings.sponsorship_tax_deductible_notice IS 'Tax notice for sponsorship receipts (508c1a)';
COMMENT ON COLUMN receipt_settings.donation_tax_deductible_notice IS 'Tax notice for donation receipts (508c1a)';