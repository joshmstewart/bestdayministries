-- Map all existing bestie roles to the new two-option system
-- "Creator", "Artist", "Designer", "Maker", "Contributor", "Partner" -> "Maker"
-- Everything else stays as is or defaults to "Maker"

UPDATE vendor_bestie_requests
SET bestie_role = 'Maker'
WHERE bestie_role IN ('Creator', 'Artist', 'Designer', 'Contributor', 'Partner')
   OR bestie_role IS NULL;

-- Set default for future records
ALTER TABLE vendor_bestie_requests 
ALTER COLUMN bestie_role SET DEFAULT 'Maker';