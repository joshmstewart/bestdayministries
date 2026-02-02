-- Add column to store the encouraging message with each mood entry
ALTER TABLE public.mood_entries 
ADD COLUMN IF NOT EXISTS encouraging_message TEXT;