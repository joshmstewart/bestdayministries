
-- Allow guardians to INSERT streaks for their linked besties
CREATE POLICY "Guardians can insert streaks for linked besties"
ON public.chore_streaks
FOR INSERT
WITH CHECK (
  public.is_guardian_of(auth.uid(), user_id)
);

-- Allow guardians to UPDATE streaks for their linked besties
CREATE POLICY "Guardians can update streaks for linked besties"
ON public.chore_streaks
FOR UPDATE
USING (
  public.is_guardian_of(auth.uid(), user_id)
);

-- Allow guardians to INSERT badges for their linked besties
CREATE POLICY "Guardians can insert badges for linked besties"
ON public.chore_badges
FOR INSERT
WITH CHECK (
  public.is_guardian_of(auth.uid(), user_id)
);
