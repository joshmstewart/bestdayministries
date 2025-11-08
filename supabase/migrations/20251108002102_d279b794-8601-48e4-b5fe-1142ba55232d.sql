-- Add enable_receipts column to receipt_settings table
ALTER TABLE receipt_settings 
ADD COLUMN IF NOT EXISTS enable_receipts boolean NOT NULL DEFAULT true;

-- Set existing record to enabled
UPDATE receipt_settings SET enable_receipts = true;