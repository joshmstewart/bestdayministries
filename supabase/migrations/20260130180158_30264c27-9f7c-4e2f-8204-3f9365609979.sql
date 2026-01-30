-- Create table for daily bar icon customization
CREATE TABLE public.daily_bar_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_bar_icons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active icons
CREATE POLICY "Anyone can view active daily bar icons"
ON public.daily_bar_icons
FOR SELECT
USING (is_active = true);

-- Admins can manage icons
CREATE POLICY "Admins can manage daily bar icons"
ON public.daily_bar_icons
FOR ALL
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- Add trigger for updated_at
CREATE TRIGGER update_daily_bar_icons_updated_at
BEFORE UPDATE ON public.daily_bar_icons
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default items
INSERT INTO public.daily_bar_icons (item_key, label, display_order) VALUES
  ('mood', 'Mood', 1),
  ('daily-five', 'Daily Five', 2),
  ('fortune', 'Fortune', 3),
  ('stickers', 'Stickers', 4);

-- Create storage bucket for daily bar icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-bar-icons', 'daily-bar-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view daily bar icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'daily-bar-icons');

CREATE POLICY "Admins can upload daily bar icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'daily-bar-icons' AND public.is_admin_or_owner());

CREATE POLICY "Admins can update daily bar icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'daily-bar-icons' AND public.is_admin_or_owner());

CREATE POLICY "Admins can delete daily bar icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'daily-bar-icons' AND public.is_admin_or_owner());