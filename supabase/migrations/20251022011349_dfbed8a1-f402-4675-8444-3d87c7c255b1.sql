
-- Allow all users to read the stickers_enabled setting
DROP POLICY IF EXISTS "Allow public read access to public settings" ON public.app_settings;

CREATE POLICY "Allow public read access to public settings"
ON public.app_settings
FOR SELECT
USING (
  setting_key = ANY (ARRAY[
    'logo_url'::text,
    'mobile_app_name'::text,
    'mobile_app_icon_url'::text,
    'sponsor_page_content'::text,
    'stickers_enabled'::text,
    'bonus_packs_enabled'::text
  ])
);
