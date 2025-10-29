-- Fix RLS policies for event_dates table to allow admins and event creators to insert dates

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own event dates" ON public.event_dates;
DROP POLICY IF EXISTS "Event creators and admins can insert event dates" ON public.event_dates;

-- Create a comprehensive policy that allows:
-- 1. Admins/owners to insert any event dates
-- 2. Event creators to insert dates for their own events
CREATE POLICY "Event creators and admins can insert event dates"
ON public.event_dates
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins and owners
  has_admin_access(auth.uid())
  OR
  -- Allow event creator to add dates to their own events
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_dates.event_id
    AND events.created_by = auth.uid()
  )
);

-- Also ensure update and delete policies exist
DROP POLICY IF EXISTS "Event creators and admins can update event dates" ON public.event_dates;
DROP POLICY IF EXISTS "Event creators and admins can delete event dates" ON public.event_dates;

CREATE POLICY "Event creators and admins can update event dates"
ON public.event_dates
FOR UPDATE
TO authenticated
USING (
  has_admin_access(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_dates.event_id
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Event creators and admins can delete event dates"
ON public.event_dates
FOR DELETE
TO authenticated
USING (
  has_admin_access(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_dates.event_id
    AND events.created_by = auth.uid()
  )
);