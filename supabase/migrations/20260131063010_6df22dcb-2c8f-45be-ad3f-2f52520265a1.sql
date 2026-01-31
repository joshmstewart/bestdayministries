-- Step 1: Update RLS policy to include custom_coin_image in public allowlist
DROP POLICY IF EXISTS "Allow public read access to public settings" ON public.app_settings;

CREATE POLICY "Allow public read access to public settings"
ON public.app_settings
FOR SELECT
TO public
USING (
  setting_key IN (
    'logo_url',
    'mobile_app_name',
    'mobile_app_icon_url',
    'sponsor_page_content',
    'stickers_enabled',
    'bonus_packs_enabled',
    'custom_coin_image'
  )
);

-- Step 2: Update the get_public_app_settings function to include custom_coin_image
CREATE OR REPLACE FUNCTION public.get_public_app_settings()
RETURNS TABLE(id uuid, setting_key text, setting_value jsonb, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    setting_key,
    setting_value,
    updated_at
  FROM app_settings
  WHERE setting_key IN ('logo_url', 'mobile_app_name', 'mobile_app_icon_url', 'sponsor_page_content', 'custom_coin_image');
$$;