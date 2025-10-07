-- Create table for "other ways to give" items
CREATE TABLE IF NOT EXISTS public.ways_to_give (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Heart',
  gradient_from TEXT NOT NULL DEFAULT 'primary/20',
  gradient_to TEXT NOT NULL DEFAULT 'primary/5',
  icon_gradient_from TEXT NOT NULL DEFAULT 'primary/20',
  icon_gradient_to TEXT NOT NULL DEFAULT 'primary/5',
  hover_border_color TEXT NOT NULL DEFAULT 'primary/50',
  button_text TEXT NOT NULL DEFAULT 'Learn More',
  button_url TEXT NOT NULL,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ways_to_give ENABLE ROW LEVEL SECURITY;

-- Public can view active items
CREATE POLICY "Active ways to give viewable by everyone"
ON public.ways_to_give
FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Admins can manage all items
CREATE POLICY "Admins can manage ways to give"
ON public.ways_to_give
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_ways_to_give_updated_at
BEFORE UPDATE ON public.ways_to_give
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default items
INSERT INTO public.ways_to_give (title, description, icon, button_text, button_url, is_popular, display_order) VALUES
('One-Time Gift', 'Make a one-time contribution to support our mission and help us reach our goals', 'Heart', 'Donate Now', '/sponsor-bestie', false, 0),
('Best Day Ministries Club', 'Join the club! Monthly donations help us grow our mission consistently', 'Heart', 'Join the Club', '/sponsor-bestie', true, 1);