-- Add visibility controls to featured_items table
ALTER TABLE public.featured_items 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_to_roles user_role[] DEFAULT ARRAY['caregiver', 'bestie', 'supporter', 'admin', 'owner']::user_role[];

-- Update existing rows to have the default visible_to_roles
UPDATE public.featured_items
SET visible_to_roles = ARRAY['caregiver', 'bestie', 'supporter', 'admin', 'owner']::user_role[]
WHERE visible_to_roles IS NULL;