-- Create cached donation history table
CREATE TABLE public.donation_history_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  stripe_charge_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  amount numeric NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('one-time', 'monthly')),
  status text NOT NULL,
  designation text NOT NULL DEFAULT 'General Support',
  donation_date timestamptz NOT NULL,
  receipt_url text,
  stripe_mode text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_donation_record UNIQUE (user_email, stripe_charge_id, stripe_invoice_id, stripe_mode)
);

-- Create index for fast lookups
CREATE INDEX idx_donation_history_cache_user_email ON public.donation_history_cache(user_email);
CREATE INDEX idx_donation_history_cache_user_id ON public.donation_history_cache(user_id);
CREATE INDEX idx_donation_history_cache_stripe_mode ON public.donation_history_cache(stripe_mode);

-- Enable RLS
ALTER TABLE public.donation_history_cache ENABLE ROW LEVEL SECURITY;

-- Users can view their own donation history
CREATE POLICY "Users can view their own donation history"
ON public.donation_history_cache FOR SELECT
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = user_email);

-- Admins can view all donation history
CREATE POLICY "Admins can view all donation history"
ON public.donation_history_cache FOR SELECT
USING (has_admin_access(auth.uid()));

-- System can insert/update (via service role in edge function)
CREATE POLICY "System can manage donation history cache"
ON public.donation_history_cache FOR ALL
USING (true)
WITH CHECK (true);

-- Create active subscriptions cache table
CREATE TABLE public.active_subscriptions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text,
  amount numeric NOT NULL,
  designation text NOT NULL DEFAULT 'General Support',
  status text NOT NULL,
  current_period_end timestamptz,
  stripe_mode text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_subscription_record UNIQUE (user_email, stripe_subscription_id, stripe_mode)
);

-- Create indexes
CREATE INDEX idx_active_subscriptions_cache_user_email ON public.active_subscriptions_cache(user_email);
CREATE INDEX idx_active_subscriptions_cache_user_id ON public.active_subscriptions_cache(user_id);

-- Enable RLS
ALTER TABLE public.active_subscriptions_cache ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.active_subscriptions_cache FOR SELECT
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = user_email);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.active_subscriptions_cache FOR SELECT
USING (has_admin_access(auth.uid()));

-- System can manage
CREATE POLICY "System can manage subscriptions cache"
ON public.active_subscriptions_cache FOR ALL
USING (true)
WITH CHECK (true);

-- Sync status tracking table
CREATE TABLE public.donation_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  stripe_mode text NOT NULL DEFAULT 'live',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  sync_status text NOT NULL DEFAULT 'completed',
  error_message text,
  donations_synced integer DEFAULT 0,
  subscriptions_synced integer DEFAULT 0,
  CONSTRAINT unique_sync_status UNIQUE (user_email, stripe_mode)
);

-- Enable RLS
ALTER TABLE public.donation_sync_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync status
CREATE POLICY "Users can view their own sync status"
ON public.donation_sync_status FOR SELECT
USING (auth.jwt() ->> 'email' = user_email);

-- System can manage
CREATE POLICY "System can manage sync status"
ON public.donation_sync_status FOR ALL
USING (true)
WITH CHECK (true);