-- Create table for managing TTS voices
CREATE TABLE IF NOT EXISTS public.tts_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_name TEXT NOT NULL UNIQUE,
  voice_label TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('standard', 'fun')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tts_voices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "TTS voices viewable by everyone"
  ON public.tts_voices
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage TTS voices"
  ON public.tts_voices
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Insert default voices
INSERT INTO public.tts_voices (voice_name, voice_label, voice_id, description, category, display_order) VALUES
  ('Aria', 'Aria', '9BWtsMINqrJLrRacOk9x', 'Warm and expressive', 'standard', 1),
  ('Roger', 'Roger', 'CwhRBWXzGAHq8TQ4Fs17', 'Confident and clear', 'standard', 2),
  ('Sarah', 'Sarah', 'EXAVITQu4vr4xnSDxMaL', 'Natural and friendly', 'standard', 3),
  ('Laura', 'Laura', 'FGY2WhTYpPnrIDTdsKH5', 'Professional and warm', 'standard', 4),
  ('austin', 'Austin', 'Bj9UqZbhQsanLzgalpEG', 'Warm and friendly voice', 'fun', 1),
  ('batman', 'Batman', '2qkvhTnYa7pn9h0BQAUq', 'Deep and mysterious voice', 'fun', 2),
  ('cherry-twinkle', 'Cherry Twinkle', 'XJ2fW4ybq7HouelYYGcL', 'Bright and cheerful voice', 'fun', 3),
  ('creature', 'Creature', 'Z7RrOqZFTyLpIlzCgfsp', 'Fun and quirky voice', 'fun', 4),
  ('elmo', 'Elmo', 'UgiuqbgD8Q7KVV5lzpSJ', 'Fun and playful voice', 'fun', 5),
  ('grandpa-werthers', 'Grandpa Werthers', 'MKlLqCItoCkvdhrxgtLv', 'Wise and comforting voice', 'fun', 6),
  ('jerry-b', 'Jerry B', 'rHWSYoq8UlV0YIBKMryp', 'Energetic and upbeat voice', 'fun', 7),
  ('johnny-dynamite', 'Johnny Dynamite', 'CeNX9CMwmxDxUF5Q2Inm', 'Bold and exciting voice', 'fun', 8),
  ('marshal', 'Marshal', 'lE5ZJB6jGeeuvSNxOvs2', 'Strong and confident voice', 'fun', 9),
  ('maverick', 'Maverick', 'V33LkP9pVLdcjeB2y5Na', 'Cool and adventurous voice', 'fun', 10)
ON CONFLICT (voice_name) DO NOTHING;