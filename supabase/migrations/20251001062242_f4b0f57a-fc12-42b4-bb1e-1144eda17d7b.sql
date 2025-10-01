-- Add recurring event fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;