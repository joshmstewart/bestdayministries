-- Create table for admin-controlled app configurations
CREATE TABLE public.app_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  visible_to_roles public.user_role[] DEFAULT '{supporter,bestie,caregiver,moderator,admin,owner}'::public.user_role[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_configurations ENABLE ROW LEVEL SECURITY;

-- Everyone can read active app configurations
CREATE POLICY "Anyone can view app configurations"
ON public.app_configurations
FOR SELECT
USING (true);

-- Only admins/owners can manage app configurations
CREATE POLICY "Admins can manage app configurations"
ON public.app_configurations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_app_configurations_updated_at
BEFORE UPDATE ON public.app_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();