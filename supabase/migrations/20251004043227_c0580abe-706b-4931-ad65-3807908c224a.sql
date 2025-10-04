-- Add Stripe Connect fields to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Create commission_settings table
CREATE TABLE IF NOT EXISTS commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage commission settings
CREATE POLICY "Admins can manage commission settings"
ON commission_settings
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Insert default commission rate
INSERT INTO commission_settings (commission_percentage, created_by)
SELECT 10.00, id FROM auth.users WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1
)
ON CONFLICT DO NOTHING;

-- Add commission tracking to order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_payout NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- Create vendor_earnings view (without RLS - security handled by underlying tables)
CREATE OR REPLACE VIEW vendor_earnings AS
SELECT 
  v.id as vendor_id,
  v.business_name,
  v.user_id,
  COUNT(DISTINCT oi.order_id) as total_orders,
  COALESCE(SUM(oi.vendor_payout), 0) as total_earnings,
  COALESCE(SUM(oi.platform_fee), 0) as total_fees,
  COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) as total_sales
FROM vendors v
LEFT JOIN order_items oi ON oi.vendor_id = v.id
WHERE oi.fulfillment_status IN ('shipped', 'delivered') OR oi.fulfillment_status IS NULL
GROUP BY v.id, v.business_name, v.user_id;