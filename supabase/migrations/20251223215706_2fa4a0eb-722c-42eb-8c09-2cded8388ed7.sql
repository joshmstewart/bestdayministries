-- Add marketplace-specific Stripe mode setting
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('marketplace_stripe_mode', '"test"')
ON CONFLICT (setting_key) DO NOTHING;