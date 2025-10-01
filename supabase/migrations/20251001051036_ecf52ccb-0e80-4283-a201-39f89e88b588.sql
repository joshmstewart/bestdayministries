-- Create enum for avatar categories
CREATE TYPE public.avatar_category AS ENUM ('humans', 'animals', 'monsters', 'shapes');

-- Create avatars table
CREATE TABLE public.avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_number INTEGER UNIQUE NOT NULL,
  category avatar_category NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Everyone can view avatars
CREATE POLICY "Avatars viewable by everyone"
ON public.avatars
FOR SELECT
USING (true);

-- Only admins and owners can manage avatars
CREATE POLICY "Admins and owners can insert avatars"
ON public.avatars
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can update avatars"
ON public.avatars
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can delete avatars"
ON public.avatars
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_avatars_updated_at
BEFORE UPDATE ON public.avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current avatars
INSERT INTO public.avatars (avatar_number, category, is_active) VALUES
  (1, 'humans', true), (2, 'humans', true), (3, 'humans', true), (4, 'humans', true),
  (5, 'humans', true), (6, 'humans', true), (7, 'humans', true), (8, 'humans', true),
  (9, 'animals', true), (10, 'humans', true), (11, 'humans', true), (12, 'monsters', true),
  (13, 'humans', true), (14, 'monsters', true), (15, 'animals', true), (16, 'shapes', true),
  (17, 'animals', true), (18, 'humans', true), (19, 'monsters', true), (20, 'animals', true),
  (21, 'animals', true), (22, 'animals', true), (23, 'humans', true), (24, 'shapes', true),
  (25, 'humans', true), (26, 'humans', true), (27, 'animals', true), (28, 'shapes', true),
  (29, 'animals', true), (30, 'animals', true), (31, 'animals', true), (32, 'animals', true);