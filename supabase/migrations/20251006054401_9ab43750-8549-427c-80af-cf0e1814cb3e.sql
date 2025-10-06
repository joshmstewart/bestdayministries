-- Create table to track all sent receipts
CREATE TABLE IF NOT EXISTS public.sponsorship_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id UUID REFERENCES public.sponsorships(id) ON DELETE CASCADE,
  sponsor_email TEXT NOT NULL,
  sponsor_name TEXT,
  bestie_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  tax_year INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_sponsorship_receipts_email ON public.sponsorship_receipts(sponsor_email);
CREATE INDEX idx_sponsorship_receipts_tax_year ON public.sponsorship_receipts(tax_year);
CREATE INDEX idx_sponsorship_receipts_sponsorship ON public.sponsorship_receipts(sponsorship_id);

-- Enable RLS
ALTER TABLE public.sponsorship_receipts ENABLE ROW LEVEL SECURITY;

-- Sponsors can view their own receipts
CREATE POLICY "Sponsors can view their own receipts"
ON public.sponsorship_receipts
FOR SELECT
USING (
  sponsor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Admins can view all receipts
CREATE POLICY "Admins can view all receipts"
ON public.sponsorship_receipts
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Service role can insert receipts (from edge functions)
CREATE POLICY "Service can insert receipts"
ON public.sponsorship_receipts
FOR INSERT
WITH CHECK (true);

-- Create view for year-end summaries
CREATE OR REPLACE VIEW public.sponsorship_year_end_summary AS
SELECT 
  sponsor_email,
  sponsor_name,
  tax_year,
  COUNT(*) as total_donations,
  SUM(amount) as total_amount,
  MIN(transaction_date) as first_donation_date,
  MAX(transaction_date) as last_donation_date,
  array_agg(
    jsonb_build_object(
      'date', transaction_date,
      'amount', amount,
      'bestie_name', bestie_name,
      'receipt_number', receipt_number
    ) ORDER BY transaction_date
  ) as donations
FROM public.sponsorship_receipts
GROUP BY sponsor_email, sponsor_name, tax_year;