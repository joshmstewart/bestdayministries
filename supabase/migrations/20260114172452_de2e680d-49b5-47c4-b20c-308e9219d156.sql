-- Add emoji column to joke_categories
ALTER TABLE public.joke_categories ADD COLUMN emoji TEXT DEFAULT '🎲';

-- Update existing categories with appropriate emojis
UPDATE public.joke_categories SET emoji = '🍕' WHERE name = 'food';
UPDATE public.joke_categories SET emoji = '🐶' WHERE name = 'animals';
UPDATE public.joke_categories SET emoji = '📚' WHERE name = 'school';
UPDATE public.joke_categories SET emoji = '⚽' WHERE name = 'sports';
UPDATE public.joke_categories SET emoji = '🎵' WHERE name = 'music';
UPDATE public.joke_categories SET emoji = '🎲' WHERE name = 'random';