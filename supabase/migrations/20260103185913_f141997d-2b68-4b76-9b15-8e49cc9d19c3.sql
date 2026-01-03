-- Expose non-sensitive marketplace access settings to all clients (bypasses app_settings RLS)
CREATE OR REPLACE FUNCTION public.get_marketplace_access_settings()
RETURNS TABLE(
  store_access_mode text,
  marketplace_stripe_mode text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (
        SELECT trim(both '"' from setting_value::text)
        FROM public.app_settings
        WHERE setting_key = 'store_access_mode'
        LIMIT 1
      ),
      'open'
    ) AS store_access_mode,
    COALESCE(
      (
        SELECT trim(both '"' from setting_value::text)
        FROM public.app_settings
        WHERE setting_key = 'marketplace_stripe_mode'
        LIMIT 1
      ),
      'live'
    ) AS marketplace_stripe_mode;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_access_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_access_settings() TO authenticated;