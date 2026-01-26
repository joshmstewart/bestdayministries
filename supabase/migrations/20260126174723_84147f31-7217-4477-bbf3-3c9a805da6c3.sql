-- Add receipt details columns to cash_register_stores
ALTER TABLE public.cash_register_stores
ADD COLUMN IF NOT EXISTS receipt_address TEXT DEFAULT '123 Main Street',
ADD COLUMN IF NOT EXISTS receipt_tagline TEXT DEFAULT 'Thank you for your order!';