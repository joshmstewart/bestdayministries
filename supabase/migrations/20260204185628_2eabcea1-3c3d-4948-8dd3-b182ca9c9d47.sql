-- Create shipping calculation audit log table
CREATE TABLE public.shipping_calculation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Request context
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  order_id UUID,
  
  -- Calculation inputs
  destination_zip TEXT,
  origin_zip TEXT,
  items JSONB NOT NULL, -- Array of items with vendor_id, product_id, quantity, is_coffee, etc.
  total_weight_oz NUMERIC,
  box_dimensions JSONB, -- {length, width, height}
  
  -- Calculation logic
  calculation_source TEXT NOT NULL, -- 'shipstation', 'easypost', 'flat_rate', 'free_shipping'
  carrier TEXT, -- 'usps', 'ups', 'fedex', etc.
  service_name TEXT, -- 'UPS Ground', 'USPS Priority', etc.
  
  -- Decision factors
  decision_reason TEXT, -- Why this source/carrier was chosen
  fallback_used BOOLEAN DEFAULT false,
  fallback_reason TEXT,
  
  -- Results
  rate_cents INTEGER,
  estimated_days INTEGER,
  
  -- Raw API response for debugging
  api_request JSONB,
  api_response JSONB,
  api_error TEXT,
  
  -- Performance
  calculation_time_ms INTEGER
);

-- Index for common queries
CREATE INDEX idx_shipping_log_created_at ON public.shipping_calculation_log(created_at DESC);
CREATE INDEX idx_shipping_log_source ON public.shipping_calculation_log(calculation_source);
CREATE INDEX idx_shipping_log_user ON public.shipping_calculation_log(user_id);

-- Enable RLS
ALTER TABLE public.shipping_calculation_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can view shipping logs"
  ON public.shipping_calculation_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'owner')
    )
  );

-- Allow edge functions to insert (service role)
CREATE POLICY "Service role can insert shipping logs"
  ON public.shipping_calculation_log
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.shipping_calculation_log IS 'Audit log for all shipping rate calculations across the platform';