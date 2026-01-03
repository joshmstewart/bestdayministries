-- Fix RLS policy to avoid referencing auth.users (causes permission denied errors)
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.donation_stripe_transactions;

CREATE POLICY "Users can view their own transactions"
ON public.donation_stripe_transactions
FOR SELECT
USING (
  auth.uid() = donor_id
  OR (
    email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);