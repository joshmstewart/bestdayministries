-- Add vendor application fields
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS product_categories text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS estimated_processing_days integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS agreed_to_vendor_terms boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS agreed_to_terms_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS application_notes text;