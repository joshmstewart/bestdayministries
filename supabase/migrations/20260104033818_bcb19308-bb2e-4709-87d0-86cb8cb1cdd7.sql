-- Add saves_count column to track cookbook additions
ALTER TABLE public.public_recipes 
ADD COLUMN saves_count INTEGER NOT NULL DEFAULT 0;