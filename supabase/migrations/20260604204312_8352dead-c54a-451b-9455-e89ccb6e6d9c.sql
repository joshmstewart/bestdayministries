ALTER TABLE public.featured_items
ADD COLUMN IF NOT EXISTS display_locations text[] NOT NULL DEFAULT ARRAY['landing','community']::text[];