-- Allow guardians to INSERT completions for their linked besties
CREATE POLICY "Guardians can insert completions for linked besties"
ON public.chore_completions
FOR INSERT
WITH CHECK (
  public.is_guardian_of(auth.uid(), user_id)
);

-- Allow guardians to UPDATE completions for their linked besties
CREATE POLICY "Guardians can update completions for linked besties"
ON public.chore_completions
FOR UPDATE
USING (
  public.is_guardian_of(auth.uid(), user_id)
);

-- Allow guardians to DELETE completions for their linked besties
CREATE POLICY "Guardians can delete completions for linked besties"
ON public.chore_completions
FOR DELETE
USING (
  public.is_guardian_of(auth.uid(), user_id)
);