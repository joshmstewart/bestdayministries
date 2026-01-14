-- Add disability column to cash_register_customers
ALTER TABLE public.cash_register_customers
ADD COLUMN disability text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.cash_register_customers.disability IS 'Optional disability representation for inclusive customer characters';