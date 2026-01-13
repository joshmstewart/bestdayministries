-- Create table for beat pad sound packs (admin managed)
CREATE TABLE public.beat_pad_sounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎵',
  description TEXT,
  color TEXT NOT NULL DEFAULT 'hsl(var(--primary))',
  sound_type TEXT NOT NULL, -- 'oscillator' or 'sample' for future
  oscillator_type TEXT DEFAULT 'sine', -- sine, square, triangle, sawtooth
  frequency NUMERIC DEFAULT 440,
  decay NUMERIC DEFAULT 0.2,
  has_noise BOOLEAN DEFAULT FALSE,
  price_coins INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- true for the 8 base sounds
  display_order INTEGER DEFAULT 0,
  visible_to_roles public.user_role[] DEFAULT ARRAY['supporter', 'bestie', 'caregiver', 'admin', 'owner']::public.user_role[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user purchased sounds
CREATE TABLE public.user_beat_pad_sounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_id UUID NOT NULL REFERENCES public.beat_pad_sounds(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sound_id)
);

-- Enable RLS
ALTER TABLE public.beat_pad_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_beat_pad_sounds ENABLE ROW LEVEL SECURITY;

-- RLS policies for beat_pad_sounds (anyone can view active, admins can manage)
CREATE POLICY "Anyone can view active beat pad sounds"
  ON public.beat_pad_sounds
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage beat pad sounds"
  ON public.beat_pad_sounds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- RLS policies for user_beat_pad_sounds
CREATE POLICY "Users can view their own purchased sounds"
  ON public.user_beat_pad_sounds
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can purchase sounds"
  ON public.user_beat_pad_sounds
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Insert the default 8 sounds (free, included by default)
INSERT INTO public.beat_pad_sounds (name, emoji, color, sound_type, oscillator_type, frequency, decay, has_noise, price_coins, is_default, display_order) VALUES
  ('Kick Drum', '🥁', 'hsl(var(--primary))', 'oscillator', 'sine', 60, 0.3, false, 0, true, 1),
  ('Snare', '🪘', 'hsl(25, 95%, 53%)', 'oscillator', 'triangle', 200, 0.1, true, 0, true, 2),
  ('Hi-Hat', '🎶', 'hsl(48, 96%, 53%)', 'oscillator', 'square', 800, 0.05, false, 0, true, 3),
  ('Clap', '👏', 'hsl(142, 71%, 45%)', 'oscillator', 'triangle', 150, 0.08, true, 0, true, 4),
  ('Bass', '🎸', 'hsl(280, 87%, 65%)', 'oscillator', 'sawtooth', 80, 0.2, false, 0, true, 5),
  ('Synth 1', '🎹', 'hsl(168, 76%, 42%)', 'oscillator', 'square', 220, 0.15, false, 0, true, 6),
  ('Synth 2', '🎵', 'hsl(221, 83%, 53%)', 'oscillator', 'sine', 330, 0.2, false, 0, true, 7),
  ('Bell', '🔔', 'hsl(340, 82%, 52%)', 'oscillator', 'sine', 523, 0.4, false, 0, true, 8);

-- Insert purchasable sounds
INSERT INTO public.beat_pad_sounds (name, emoji, color, sound_type, oscillator_type, frequency, decay, has_noise, price_coins, is_default, display_order) VALUES
  -- Drums/Percussion
  ('Open Hi-Hat', '🎼', 'hsl(45, 93%, 47%)', 'oscillator', 'square', 600, 0.15, true, 75, false, 10),
  ('Crash Cymbal', '💥', 'hsl(38, 92%, 50%)', 'oscillator', 'square', 400, 0.5, true, 100, false, 11),
  ('Ride Cymbal', '✨', 'hsl(48, 89%, 55%)', 'oscillator', 'triangle', 500, 0.3, true, 100, false, 12),
  ('Low Tom', '🪘', 'hsl(15, 85%, 45%)', 'oscillator', 'sine', 100, 0.25, false, 75, false, 13),
  ('Mid Tom', '🥁', 'hsl(20, 90%, 50%)', 'oscillator', 'sine', 150, 0.2, false, 75, false, 14),
  ('High Tom', '🎵', 'hsl(25, 95%, 55%)', 'oscillator', 'sine', 200, 0.15, false, 75, false, 15),
  ('Rimshot', '🔊', 'hsl(30, 80%, 50%)', 'oscillator', 'square', 250, 0.05, true, 50, false, 16),
  ('Cowbell', '🔔', 'hsl(35, 85%, 55%)', 'oscillator', 'square', 700, 0.1, false, 50, false, 17),
  ('Shaker', '🎭', 'hsl(40, 70%, 60%)', 'oscillator', 'triangle', 1200, 0.08, true, 50, false, 18),
  ('Tambourine', '🎪', 'hsl(50, 75%, 55%)', 'oscillator', 'square', 1000, 0.1, true, 50, false, 19),
  ('Conga', '🪘', 'hsl(15, 75%, 40%)', 'oscillator', 'sine', 180, 0.18, false, 75, false, 20),
  ('Bongo', '🥁', 'hsl(20, 80%, 45%)', 'oscillator', 'sine', 280, 0.12, false, 75, false, 21),
  -- Bass
  ('808 Bass', '💎', 'hsl(280, 100%, 40%)', 'oscillator', 'sine', 40, 0.5, false, 150, false, 30),
  ('Sub Bass', '🌊', 'hsl(260, 90%, 35%)', 'oscillator', 'sine', 30, 0.6, false, 125, false, 31),
  ('Wobble Bass', '🎸', 'hsl(270, 85%, 50%)', 'oscillator', 'sawtooth', 50, 0.4, false, 175, false, 32),
  -- Synths
  ('Pad', '🌈', 'hsl(200, 80%, 50%)', 'oscillator', 'sine', 260, 0.8, false, 125, false, 40),
  ('Pluck', '🎻', 'hsl(180, 75%, 45%)', 'oscillator', 'triangle', 400, 0.08, false, 100, false, 41),
  ('Lead', '⚡', 'hsl(300, 90%, 55%)', 'oscillator', 'sawtooth', 440, 0.12, false, 125, false, 42),
  ('Arpeggio', '🎹', 'hsl(320, 85%, 50%)', 'oscillator', 'square', 350, 0.1, false, 150, false, 43),
  ('Stab', '🗡️', 'hsl(0, 80%, 50%)', 'oscillator', 'sawtooth', 300, 0.06, false, 100, false, 44),
  -- Other
  ('Piano', '🎹', 'hsl(0, 0%, 20%)', 'oscillator', 'triangle', 262, 0.3, false, 150, false, 50),
  ('Organ', '🎵', 'hsl(240, 60%, 50%)', 'oscillator', 'square', 200, 0.4, false, 125, false, 51),
  ('Brass Hit', '🎺', 'hsl(45, 100%, 50%)', 'oscillator', 'sawtooth', 350, 0.15, false, 125, false, 52),
  ('String Hit', '🎻', 'hsl(10, 70%, 45%)', 'oscillator', 'triangle', 280, 0.25, false, 125, false, 53),
  ('Vocal Chop', '🎤', 'hsl(330, 70%, 55%)', 'oscillator', 'sine', 500, 0.15, true, 200, false, 54);

-- Add trigger for updated_at
CREATE TRIGGER update_beat_pad_sounds_updated_at
  BEFORE UPDATE ON public.beat_pad_sounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();