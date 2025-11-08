-- Drop the foreign key constraint so sponsorship_id can reference either sponsorships or donations
ALTER TABLE sponsorship_receipts 
DROP CONSTRAINT IF EXISTS sponsorship_receipts_sponsorship_id_fkey;

-- Now link existing donation receipts
UPDATE sponsorship_receipts 
SET sponsorship_id = 'afbce60a-9e32-4d01-b217-551da1772914'
WHERE id = '9724c9a5-0e82-4ed3-bde0-e86afb895b35';

DELETE FROM sponsorship_receipts 
WHERE id IN ('4eeaeecb-8a7e-4315-af40-494d7a34341b', '774a1ddc-2f46-4fe2-9cb7-629f6d634a4b');

UPDATE sponsorship_receipts 
SET sponsorship_id = 'd018a316-bc33-45fd-9f28-0eff6114650f'
WHERE id = 'd0a71e71-4ba9-481b-9cbb-33eb2cfffba8';