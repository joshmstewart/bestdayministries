-- Create community_features table
CREATE TABLE IF NOT EXISTS public.community_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Heart',
  gradient TEXT NOT NULL DEFAULT 'from-primary/20 to-primary/5',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.community_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Features viewable by everyone"
  ON public.community_features
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage features"
  ON public.community_features
  FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_community_features_updated_at
  BEFORE UPDATE ON public.community_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default features
INSERT INTO public.community_features (title, description, icon, gradient, display_order) VALUES
('Featured Bestie of the Month', 'Celebrate a community member with their story, photos, and voice notes that everyone can hear and support', 'Heart', 'from-primary/20 to-primary/5', 1),
('Community Events', 'Join virtual and in-person events, workshops, and gatherings designed for connection and fun', 'Calendar', 'from-secondary/20 to-secondary/5', 2),
('Discussions & Forums', 'Share experiences, ask questions, and support each other in safe, moderated spaces', 'MessageSquare', 'from-accent/20 to-accent/5', 3),
('Sponsor a Bestie', 'Make a direct impact by sponsoring community members and supporting their independence journey', 'Gift', 'from-primary/20 to-secondary/5', 4),
('Family Connections', 'Guardians can link to their Besties'' accounts to stay connected and provide support when needed', 'Link2', 'from-secondary/20 to-accent/5', 5),
('Audio Notifications', 'Besties can enable audio notifications for an accessible, easy-to-use experience', 'Volume2', 'from-accent/20 to-primary/5', 6),
('Mutual Support Network', 'Guardians and supporters connect with each other for advice, encouragement, and shared experiences', 'Users', 'from-primary/20 to-accent/5', 7),
('AI-Moderated Safety', 'Our AI helps ensure all content follows community guidelines, keeping the space positive and safe', 'Shield', 'from-secondary/20 to-primary/5', 8);