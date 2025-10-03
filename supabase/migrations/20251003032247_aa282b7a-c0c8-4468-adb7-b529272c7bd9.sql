-- Add DELETE policy for events table
-- Allow event creators to delete their own events
CREATE POLICY "Event creators can delete their events"
ON public.events
FOR DELETE
USING (auth.uid() = created_by);

-- Allow admins to delete any event
CREATE POLICY "Admins can delete events"
ON public.events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'owner')
  )
);