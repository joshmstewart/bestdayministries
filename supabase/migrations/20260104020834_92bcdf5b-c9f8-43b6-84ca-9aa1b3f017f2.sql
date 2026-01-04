-- Add ShipStation tracking columns to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS shipstation_order_id text,
ADD COLUMN IF NOT EXISTS shipstation_order_key text,
ADD COLUMN IF NOT EXISTS shipstation_shipment_id text,
ADD COLUMN IF NOT EXISTS shipstation_synced_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS shipstation_last_checked_at timestamp with time zone;

-- Add index for efficient ShipStation sync queries
CREATE INDEX IF NOT EXISTS idx_order_items_shipstation_order_id ON public.order_items(shipstation_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_pending_shipstation ON public.order_items(fulfillment_status) 
WHERE fulfillment_status IN ('pending', 'shipped');