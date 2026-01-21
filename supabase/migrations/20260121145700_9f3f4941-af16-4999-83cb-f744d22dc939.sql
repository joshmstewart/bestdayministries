-- Add 'once' to the chore_recurrence_type enum
ALTER TYPE public.chore_recurrence_type ADD VALUE IF NOT EXISTS 'once';