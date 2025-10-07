-- Create general donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES auth.users(id),
  donor_email TEXT,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'monthly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_mode TEXT NOT NULL DEFAULT 'test' CHECK (stripe_mode IN ('test', 'live')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT donor_identifier_check CHECK (
    (donor_id IS NOT NULL AND donor_email IS NULL) OR 
    (donor_id IS NULL AND donor_email IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Donors can view their own donations
CREATE POLICY "Donors can view their own donations by id"
  ON public.donations
  FOR SELECT
  USING (auth.uid() = donor_id);

-- Donors can view their donations by email (for guest checkouts)
CREATE POLICY "Donors can view their own donations by email"
  ON public.donations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = donations.donor_email
    )
  );

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
  ON public.donations
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Admins can update donations
CREATE POLICY "Admins can update donations"
  ON public.donations
  FOR UPDATE
  USING (has_admin_access(auth.uid()));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_email ON public.donations(donor_email);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_subscription_id ON public.donations(stripe_subscription_id);

-- Add updated_at trigger
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();