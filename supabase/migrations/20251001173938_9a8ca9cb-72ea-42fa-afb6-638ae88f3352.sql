-- Create table for multiple event dates
CREATE TABLE public.event_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_event_dates_event_id ON public.event_dates(event_id);
CREATE INDEX idx_event_dates_date ON public.event_dates(event_date);

-- Enable Row Level Security
ALTER TABLE public.event_dates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view event dates
CREATE POLICY "Event dates viewable by everyone"
ON public.event_dates
FOR SELECT
USING (true);

-- Allow authenticated users to insert event dates for their own events
CREATE POLICY "Event creators can add dates"
ON public.event_dates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_dates.event_id
    AND events.created_by = auth.uid()
  )
);

-- Allow event creators to delete dates
CREATE POLICY "Event creators can delete dates"
ON public.event_dates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_dates.event_id
    AND events.created_by = auth.uid()
  )
);