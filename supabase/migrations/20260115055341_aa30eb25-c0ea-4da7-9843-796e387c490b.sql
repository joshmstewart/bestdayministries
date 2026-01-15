-- Create user beat presets table for saving preferred starting instrument configurations
CREATE TABLE public.beat_pad_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  instrument_ids TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beat_pad_presets ENABLE ROW LEVEL SECURITY;

-- Users can view their own presets
CREATE POLICY "Users can view their own presets" 
ON public.beat_pad_presets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own presets
CREATE POLICY "Users can create their own presets" 
ON public.beat_pad_presets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own presets
CREATE POLICY "Users can update their own presets" 
ON public.beat_pad_presets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own presets
CREATE POLICY "Users can delete their own presets" 
ON public.beat_pad_presets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for presets
ALTER PUBLICATION supabase_realtime ADD TABLE public.beat_pad_presets;