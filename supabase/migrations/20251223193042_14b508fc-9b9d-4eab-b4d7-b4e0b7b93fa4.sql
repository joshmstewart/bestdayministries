-- Add columns to store original Printify data at import time
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS printify_original_title TEXT,
ADD COLUMN IF NOT EXISTS printify_original_description TEXT,
ADD COLUMN IF NOT EXISTS printify_original_price DECIMAL(10,2);

-- Backfill existing Printify products with current values as baseline
UPDATE products 
SET 
  printify_original_title = name,
  printify_original_description = description,
  printify_original_price = price
WHERE is_printify_product = true 
  AND printify_original_title IS NULL;