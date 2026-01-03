-- Create table to store combined Stripe transaction data
CREATE TABLE public.donation_stripe_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_mode text NOT NULL,
  email text NOT NULL,
  donor_id uuid REFERENCES public.profiles(id),
  
  -- Stripe IDs
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  
  -- Extracted combined data
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL,
  frequency text NOT NULL,
  
  -- Timestamps
  transaction_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Raw Stripe objects for debugging
  raw_invoice jsonb,
  raw_payment_intent jsonb,
  raw_charge jsonb,
  raw_checkout_session jsonb,
  merged_metadata jsonb,
  
  -- Links to parent records
  donation_id uuid REFERENCES public.donations(id),
  receipt_id uuid REFERENCES public.sponsorship_receipts(id)
);

-- Create unique constraint on transaction key (prefer invoice_id)
CREATE UNIQUE INDEX donation_stripe_transactions_invoice_key 
  ON public.donation_stripe_transactions (stripe_mode, stripe_invoice_id) 
  WHERE stripe_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX donation_stripe_transactions_pi_key 
  ON public.donation_stripe_transactions (stripe_mode, stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL AND stripe_invoice_id IS NULL;

CREATE UNIQUE INDEX donation_stripe_transactions_charge_key 
  ON public.donation_stripe_transactions (stripe_mode, stripe_charge_id) 
  WHERE stripe_charge_id IS NOT NULL AND stripe_invoice_id IS NULL AND stripe_payment_intent_id IS NULL;

-- Index for lookups
CREATE INDEX donation_stripe_transactions_email_idx ON public.donation_stripe_transactions (email);
CREATE INDEX donation_stripe_transactions_date_idx ON public.donation_stripe_transactions (transaction_date);
CREATE INDEX donation_stripe_transactions_donation_idx ON public.donation_stripe_transactions (donation_id);

-- Enable RLS
ALTER TABLE public.donation_stripe_transactions ENABLE ROW LEVEL SECURITY;

-- Admin/owner only policies
CREATE POLICY "Admins can view all combined transactions"
  ON public.donation_stripe_transactions
  FOR SELECT
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can insert combined transactions"
  ON public.donation_stripe_transactions
  FOR INSERT
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update combined transactions"
  ON public.donation_stripe_transactions
  FOR UPDATE
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete combined transactions"
  ON public.donation_stripe_transactions
  FOR DELETE
  USING (public.has_admin_access(auth.uid()));