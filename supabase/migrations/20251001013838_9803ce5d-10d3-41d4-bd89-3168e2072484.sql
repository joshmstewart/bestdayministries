-- Remove foreign key constraint and add name field for standalone featured besties
ALTER TABLE public.featured_besties DROP CONSTRAINT IF EXISTS featured_besties_bestie_id_fkey;

-- Change bestie_id to allow any UUID (not necessarily a profile)
-- Add bestie_name field
ALTER TABLE public.featured_besties 
  ADD COLUMN IF NOT EXISTS bestie_name TEXT;

-- For existing records, copy the name from profiles if it exists
UPDATE public.featured_besties fb
SET bestie_name = p.display_name
FROM public.profiles p
WHERE fb.bestie_id = p.id AND fb.bestie_name IS NULL;

-- Make bestie_name required going forward
ALTER TABLE public.featured_besties 
  ALTER COLUMN bestie_name SET NOT NULL;

-- bestie_id can now be removed or kept as optional reference
-- Let's keep it but make it optional and not enforce foreign key
ALTER TABLE public.featured_besties 
  ALTER COLUMN bestie_id DROP NOT NULL;