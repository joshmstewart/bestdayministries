-- Add transfer_status column to order_items for tracking vendor payout status
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending' 
CHECK (transfer_status IN ('pending', 'pending_funds', 'transferred', 'failed'));

-- Add transfer_error_message for debugging
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS transfer_error_message TEXT;

-- Add transfer_attempts to track retry count
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS transfer_attempts INTEGER DEFAULT 0;

-- Add last_transfer_attempt timestamp
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS last_transfer_attempt TIMESTAMPTZ;

-- Add payout_reserve_amount setting to app_settings if not exists
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('payout_reserve_amount', '100'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_order_items_transfer_retry 
ON public.order_items (transfer_status, fulfillment_status) 
WHERE transfer_status IN ('pending', 'pending_funds') 
  AND fulfillment_status IN ('shipped', 'delivered');