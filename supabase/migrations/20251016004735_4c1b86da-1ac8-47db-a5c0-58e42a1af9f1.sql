-- Add vendor_bestie_request_id to vendor_bestie_assets table
ALTER TABLE public.vendor_bestie_assets 
ADD COLUMN vendor_bestie_request_id UUID REFERENCES public.vendor_bestie_requests(id) ON DELETE SET NULL;

CREATE INDEX idx_vendor_bestie_assets_request_id 
ON public.vendor_bestie_assets(vendor_bestie_request_id);

-- Rename tax_id to organization_ein in receipt_settings table
ALTER TABLE public.receipt_settings 
RENAME COLUMN tax_id TO organization_ein;