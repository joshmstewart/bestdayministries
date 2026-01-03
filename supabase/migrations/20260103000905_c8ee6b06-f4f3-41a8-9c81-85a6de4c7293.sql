-- Drop the unique constraint on user_id to allow multiple vendors per user
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_user_id_key;

-- Add a comment explaining the relationship
COMMENT ON COLUMN public.vendors.user_id IS 'The user who owns this vendor account. A user can have multiple vendor accounts.';