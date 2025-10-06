-- Fix 1: Update sponsorship_receipts RLS to properly filter for non-admins
-- Currently admins see ALL receipts, but personal donation history should only show user's own

-- Drop the admin policy for SELECT (they can still see all via admin panel)
DROP POLICY IF EXISTS "Admins can view all receipts" ON public.sponsorship_receipts;

-- Keep the user policy that filters by email
-- Policy already exists: "Users can view their own receipts"

-- Fix 2: Add user_id column to sponsorship_receipts for better tracking
ALTER TABLE public.sponsorship_receipts 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sponsorship_receipts_user_id 
ON public.sponsorship_receipts(user_id);

-- Update RLS policy to use user_id OR sponsor_email
DROP POLICY IF EXISTS "Users can view their own receipts" ON public.sponsorship_receipts;

CREATE POLICY "Users can view their own receipts"
ON public.sponsorship_receipts
FOR SELECT
USING (
  -- Match by user_id (for logged-in sponsorships)
  auth.uid() = user_id
  OR
  -- Match by email (for guest sponsorships or legacy records)
  sponsor_email = get_user_email(auth.uid())
);

-- Admins still need to see all receipts in admin panel
CREATE POLICY "Admins can view all receipts in admin context"
ON public.sponsorship_receipts
FOR SELECT
USING (
  has_admin_access(auth.uid()) 
  AND current_setting('request.path', true) LIKE '%admin%'
);