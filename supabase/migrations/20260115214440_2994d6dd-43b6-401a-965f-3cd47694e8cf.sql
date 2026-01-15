-- Create table to track unmatched recipe items from user imports
CREATE TABLE public.recipe_unmatched_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('ingredient', 'tool')),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_to TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(item_name, item_type)
);

-- Enable RLS
ALTER TABLE public.recipe_unmatched_items ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage
CREATE POLICY "Admins can manage unmatched items"
  ON public.recipe_unmatched_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Add index for sorting by occurrence
CREATE INDEX idx_recipe_unmatched_items_count ON public.recipe_unmatched_items(occurrence_count DESC);
CREATE INDEX idx_recipe_unmatched_items_type ON public.recipe_unmatched_items(item_type);