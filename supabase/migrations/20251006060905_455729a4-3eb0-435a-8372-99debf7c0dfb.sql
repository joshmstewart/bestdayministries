-- Remove foreign key constraint from user_id column
ALTER TABLE sponsorship_receipts 
DROP CONSTRAINT IF EXISTS sponsorship_receipts_user_id_fkey;

-- The column stays as a plain UUID without foreign key reference
-- This prevents RLS from trying to access auth.users table