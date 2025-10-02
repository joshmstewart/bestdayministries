-- ========================================
-- SECURITY ENHANCEMENT: Rate Limiting Infrastructure
-- Prevent abuse of sensitive endpoints
-- ========================================

-- Create rate limiting table to track requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint, window_start)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow system/functions to manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _endpoint TEXT,
  _max_requests INTEGER,
  _window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count INTEGER;
  _window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate current window start (rounded to the window interval)
  _window_start := date_trunc('minute', now()) - 
    (EXTRACT(minute FROM now())::INTEGER % _window_minutes) * INTERVAL '1 minute';
  
  -- Get or create rate limit record
  INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (_user_id, _endpoint, _window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    created_at = now()
  RETURNING request_count INTO _current_count;
  
  -- Check if limit exceeded
  IF _current_count > _max_requests THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create cleanup function to remove old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint 
ON public.rate_limits(user_id, endpoint, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
ON public.rate_limits(created_at);