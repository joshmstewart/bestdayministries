-- Create AI Gateway usage tracking table
CREATE TABLE public.ai_gateway_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  model TEXT,
  user_id UUID,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost DECIMAL(10, 6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for querying by date and function
CREATE INDEX idx_ai_gateway_usage_created_at ON public.ai_gateway_usage_log(created_at DESC);
CREATE INDEX idx_ai_gateway_usage_function ON public.ai_gateway_usage_log(function_name);

-- Enable RLS
ALTER TABLE public.ai_gateway_usage_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view usage logs
CREATE POLICY "Admins can view AI usage logs"
ON public.ai_gateway_usage_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'owner')
  )
);

-- Service role can insert (edge functions)
CREATE POLICY "Service role can insert AI usage logs"
ON public.ai_gateway_usage_log
FOR INSERT
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.ai_gateway_usage_log IS 'Tracks all AI Gateway calls from edge functions for cost monitoring';