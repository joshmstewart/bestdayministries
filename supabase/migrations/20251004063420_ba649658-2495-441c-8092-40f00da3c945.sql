-- Add bestie_role column to vendor_bestie_requests
ALTER TABLE vendor_bestie_requests 
ADD COLUMN bestie_role TEXT DEFAULT 'Creator';

COMMENT ON COLUMN vendor_bestie_requests.bestie_role IS 'Role of the bestie with this vendor (e.g., Creator, Artist, Contributor)';