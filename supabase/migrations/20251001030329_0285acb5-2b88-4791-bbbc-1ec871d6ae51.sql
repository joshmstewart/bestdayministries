-- Replace featured_month with start_date and end_date for flexible date ranges
ALTER TABLE public.featured_besties 
  DROP COLUMN featured_month;

ALTER TABLE public.featured_besties 
  ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN end_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Add a check constraint to ensure end_date is after start_date
ALTER TABLE public.featured_besties 
  ADD CONSTRAINT check_date_range CHECK (end_date >= start_date);