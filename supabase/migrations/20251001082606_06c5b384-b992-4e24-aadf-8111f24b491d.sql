-- Create app settings table for global app configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Settings viewable by everyone
CREATE POLICY "Settings viewable by everyone"
ON public.app_settings
FOR SELECT
USING (true);

-- Only admins and owners can update settings
CREATE POLICY "Admins and owners can update settings"
ON public.app_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
  )
);

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
  ('logo_url', '"https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/app-assets/logo.png"'::jsonb),
  ('mobile_app_name', '"Joy House Community"'::jsonb),
  ('mobile_app_icon_url', '"https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/app-assets/icon.png"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create storage bucket for app assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for app assets
CREATE POLICY "App assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'app-assets');

CREATE POLICY "Admins and owners can upload app assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'app-assets' AND
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can update app assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'app-assets' AND
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can delete app assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'app-assets' AND
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
  )
);