-- Create table for daily engagement feature visibility settings
CREATE TABLE IF NOT EXISTS public.daily_engagement_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  visible_to_roles public.user_role[] DEFAULT ARRAY['supporter', 'bestie', 'caregiver', 'moderator', 'admin', 'owner']::public.user_role[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_engagement_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone authenticated can view settings"
  ON public.daily_engagement_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update settings"
  ON public.daily_engagement_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_owner());

CREATE POLICY "Only admins can insert settings"
  ON public.daily_engagement_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_owner());

-- Insert default settings for the three features
INSERT INTO public.daily_engagement_settings (feature_key, feature_name, is_enabled, visible_to_roles)
VALUES 
  ('daily_scratch_widget', 'Daily Scratch Widget (Floating)', true, ARRAY['supporter', 'bestie', 'caregiver', 'moderator', 'admin', 'owner']::public.user_role[]),
  ('login_streak_button', 'Login Streak Button', true, ARRAY['supporter', 'bestie', 'caregiver', 'moderator', 'admin', 'owner']::public.user_role[]),
  ('daily_bar', 'Daily Bar on Homepage', true, ARRAY['supporter', 'bestie', 'caregiver', 'moderator', 'admin', 'owner']::public.user_role[])
ON CONFLICT (feature_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_daily_engagement_settings_updated_at
  BEFORE UPDATE ON public.daily_engagement_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();