-- Create a public view of app_settings without exposing admin user IDs
CREATE OR REPLACE VIEW public.app_settings_public AS
SELECT 
  id,
  setting_key,
  setting_value,
  updated_at
FROM public.app_settings;

-- Grant select on the view to authenticated and anon users
GRANT SELECT ON public.app_settings_public TO authenticated, anon;

-- Drop ALL existing SELECT policies on app_settings
DROP POLICY IF EXISTS "Settings viewable by everyone" ON public.app_settings;
DROP POLICY IF EXISTS "Public can view settings through view" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can view all settings including metadata" ON public.app_settings;

-- Create new restrictive policies
CREATE POLICY "Admins can view all settings including metadata"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'owner')
  )
);