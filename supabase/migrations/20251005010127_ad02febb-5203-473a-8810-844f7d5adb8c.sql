-- Update RLS policy to allow public access to sponsor_page_content
DROP POLICY IF EXISTS "Allow public read access to public settings" ON public.app_settings;

CREATE POLICY "Allow public read access to public settings"
ON public.app_settings
FOR SELECT
TO public
USING (
  setting_key IN ('logo_url', 'mobile_app_name', 'mobile_app_icon_url', 'sponsor_page_content')
);