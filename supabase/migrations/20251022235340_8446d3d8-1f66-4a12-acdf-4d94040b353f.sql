-- Create table for sound effect assignments
CREATE TABLE IF NOT EXISTS public.app_sound_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  audio_clip_id UUID REFERENCES public.audio_clips(id) ON DELETE SET NULL,
  is_enabled BOOLEAN DEFAULT true,
  volume DECIMAL(3,2) DEFAULT 0.50 CHECK (volume >= 0 AND volume <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.app_sound_effects ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read sound effects
CREATE POLICY "Anyone can view sound effects"
  ON public.app_sound_effects
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage sound effects
CREATE POLICY "Admins can manage sound effects"
  ON public.app_sound_effects
  FOR ALL
  TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Insert default event types
INSERT INTO public.app_sound_effects (event_type, is_enabled) VALUES
  ('notification', true),
  ('sticker_pack_open', true),
  ('sticker_reveal', true),
  ('login', true),
  ('logout', false),
  ('message_sent', true),
  ('message_received', true),
  ('level_up', true),
  ('achievement', true),
  ('error', true),
  ('success', true),
  ('button_click', false)
ON CONFLICT (event_type) DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_app_sound_effects_updated_at
  BEFORE UPDATE ON public.app_sound_effects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();