-- Create saved locations table
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

-- Admins can manage saved locations
CREATE POLICY "Admins can manage saved locations"
ON public.saved_locations
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Everyone can view active saved locations
CREATE POLICY "Saved locations viewable by everyone"
ON public.saved_locations
FOR SELECT
TO authenticated
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_locations_updated_at
BEFORE UPDATE ON public.saved_locations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.saved_locations IS 'Saved event locations for quick reuse';
COMMENT ON COLUMN public.saved_locations.name IS 'Display name for the location';
COMMENT ON COLUMN public.saved_locations.address IS 'Full address of the location';