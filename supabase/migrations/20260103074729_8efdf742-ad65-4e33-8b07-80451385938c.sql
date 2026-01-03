-- Allow users to view their own donation transactions
CREATE POLICY "Users can view their own transactions"
ON public.donation_stripe_transactions
FOR SELECT
USING (
  auth.uid() = donor_id
  OR email ILIKE (SELECT email FROM auth.users WHERE id = auth.uid())
);