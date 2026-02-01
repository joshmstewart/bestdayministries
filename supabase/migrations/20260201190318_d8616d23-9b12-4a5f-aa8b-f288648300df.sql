
-- Fix: Add chore_wheel_config to public readable settings
-- This allows all authenticated users to read the wheel configuration

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
    'bonus_packs_enabled'::text,
    'custom_coin_image'::text,
    'chore_wheel_config'::text  -- Add wheel config for all users
  ])
);
