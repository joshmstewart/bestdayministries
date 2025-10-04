-- Create vendor_bestie_requests table for approval workflow
CREATE TABLE vendor_bestie_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  bestie_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, bestie_id)
);

-- Create index for faster queries
CREATE INDEX idx_vendor_bestie_requests_status ON vendor_bestie_requests(status);
CREATE INDEX idx_vendor_bestie_requests_bestie ON vendor_bestie_requests(bestie_id);
CREATE INDEX idx_vendor_bestie_requests_vendor ON vendor_bestie_requests(vendor_id);

-- Add featured_bestie_id to vendors table (optional - which bestie to showcase)
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS featured_bestie_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN vendors.featured_bestie_id IS 'Optional bestie to feature on vendor profile page';

-- RLS Policies
ALTER TABLE vendor_bestie_requests ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own requests
CREATE POLICY "Vendors can view their own requests"
ON vendor_bestie_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendors 
    WHERE vendors.id = vendor_bestie_requests.vendor_id 
    AND vendors.user_id = auth.uid()
  )
);

-- Vendors can create requests
CREATE POLICY "Vendors can create requests"
ON vendor_bestie_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendors 
    WHERE vendors.id = vendor_bestie_requests.vendor_id 
    AND vendors.user_id = auth.uid()
    AND vendors.status = 'approved'
  )
  AND status = 'pending'
);

-- Guardians can view requests for their besties
CREATE POLICY "Guardians can view requests for their besties"
ON vendor_bestie_requests
FOR SELECT
TO authenticated
USING (
  is_guardian_of(auth.uid(), bestie_id)
);

-- Guardians can update requests for their besties
CREATE POLICY "Guardians can update requests for their besties"
ON vendor_bestie_requests
FOR UPDATE
TO authenticated
USING (
  is_guardian_of(auth.uid(), bestie_id)
)
WITH CHECK (
  is_guardian_of(auth.uid(), bestie_id)
);

-- Admins can view all requests
CREATE POLICY "Admins can view all vendor bestie requests"
ON vendor_bestie_requests
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Admins can update all requests
CREATE POLICY "Admins can update all vendor bestie requests"
ON vendor_bestie_requests
FOR UPDATE
TO authenticated
USING (has_admin_access(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_bestie_requests_updated_at
BEFORE UPDATE ON vendor_bestie_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();