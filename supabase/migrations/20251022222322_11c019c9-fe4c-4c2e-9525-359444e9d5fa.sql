-- Create audio_clips table for managing reusable audio files
CREATE TABLE IF NOT EXISTS public.audio_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  duration INTEGER, -- duration in seconds
  category TEXT, -- for organizing clips (e.g., 'notification', 'background', 'effects')
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_clips ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active audio clips
CREATE POLICY "Active audio clips viewable by authenticated users"
  ON public.audio_clips
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Policy: Admins can view all audio clips
CREATE POLICY "Admins can view all audio clips"
  ON public.audio_clips
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Policy: Admins can insert audio clips
CREATE POLICY "Admins can insert audio clips"
  ON public.audio_clips
  FOR INSERT
  WITH CHECK (has_admin_access(auth.uid()));

-- Policy: Admins can update audio clips
CREATE POLICY "Admins can update audio clips"
  ON public.audio_clips
  FOR UPDATE
  USING (has_admin_access(auth.uid()));

-- Policy: Admins can delete audio clips
CREATE POLICY "Admins can delete audio clips"
  ON public.audio_clips
  FOR DELETE
  USING (has_admin_access(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_audio_clips_updated_at
  BEFORE UPDATE ON public.audio_clips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_audio_clips_category ON public.audio_clips(category);
CREATE INDEX idx_audio_clips_active ON public.audio_clips(is_active);

-- Create storage bucket for audio clips
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-clips', 'audio-clips', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio-clips bucket
CREATE POLICY "Audio clips are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'audio-clips');

CREATE POLICY "Admins can upload audio clips"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'audio-clips' 
    AND has_admin_access(auth.uid())
  );

CREATE POLICY "Admins can update audio clips"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'audio-clips' 
    AND has_admin_access(auth.uid())
  );

CREATE POLICY "Admins can delete audio clips"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'audio-clips' 
    AND has_admin_access(auth.uid())
  );