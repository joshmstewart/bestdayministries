-- Drop the old constraint and add a new one with all valid source types
ALTER TABLE public.daily_fortunes DROP CONSTRAINT daily_fortunes_source_type_check;

ALTER TABLE public.daily_fortunes ADD CONSTRAINT daily_fortunes_source_type_check 
  CHECK (source_type = ANY (ARRAY['quote'::text, 'affirmation'::text, 'bible_verse'::text, 'life_lesson'::text, 'proverbs'::text, 'gratitude_prompt'::text, 'discussion_starter'::text]));