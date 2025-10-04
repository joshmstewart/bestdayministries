-- Create table for vendor-selected bestie assets
CREATE TABLE public.vendor_bestie_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  bestie_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'voice_note', 'video')),
  asset_url TEXT NOT NULL,
  asset_title TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, asset_url)
);

-- Enable RLS
ALTER TABLE public.vendor_bestie_assets ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own selected assets
CREATE POLICY "Vendors can view their assets"
ON public.vendor_bestie_assets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = vendor_bestie_assets.vendor_id
      AND vendors.user_id = auth.uid()
  )
);

-- Vendors can insert assets (status determined by guardian settings)
CREATE POLICY "Vendors can select assets"
ON public.vendor_bestie_assets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendors
    JOIN public.vendor_bestie_requests vbr ON vbr.vendor_id = vendors.id
    WHERE vendors.id = vendor_bestie_assets.vendor_id
      AND vendors.user_id = auth.uid()
      AND vbr.bestie_id = vendor_bestie_assets.bestie_id
      AND vbr.status = 'approved'
  )
);

-- Vendors can update/delete their pending assets
CREATE POLICY "Vendors can manage pending assets"
ON public.vendor_bestie_assets
FOR ALL
USING (
  approval_status = 'pending_approval' 
  AND EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = vendor_bestie_assets.vendor_id
      AND vendors.user_id = auth.uid()
  )
);

-- Guardians can view assets for their besties
CREATE POLICY "Guardians can view bestie assets"
ON public.vendor_bestie_assets
FOR SELECT
USING (
  is_guardian_of(auth.uid(), bestie_id)
);

-- Guardians can approve/reject assets
CREATE POLICY "Guardians can approve assets"
ON public.vendor_bestie_assets
FOR UPDATE
USING (
  is_guardian_of(auth.uid(), bestie_id)
);

-- Public can view approved assets
CREATE POLICY "Public can view approved assets"
ON public.vendor_bestie_assets
FOR SELECT
USING (approval_status = 'approved');

-- Admins can manage all assets
CREATE POLICY "Admins can manage all assets"
ON public.vendor_bestie_assets
FOR ALL
USING (has_admin_access(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_vendor_bestie_assets_updated_at
  BEFORE UPDATE ON public.vendor_bestie_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();