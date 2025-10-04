-- Add tracking fields to order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Create index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_order_items_tracking 
ON order_items(tracking_number) 
WHERE tracking_number IS NOT NULL;