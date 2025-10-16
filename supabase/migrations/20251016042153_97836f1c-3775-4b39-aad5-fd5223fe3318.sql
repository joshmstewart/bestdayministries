-- Create enum for sticker rarity
CREATE TYPE sticker_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- Create sticker_collections table
CREATE TABLE public.sticker_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  completion_badge_id UUID,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stickers table
CREATE TABLE public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.sticker_collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  rarity sticker_rarity NOT NULL,
  visual_style TEXT NOT NULL,
  drop_rate NUMERIC(5,2) NOT NULL CHECK (drop_rate >= 0 AND drop_rate <= 100),
  sticker_number INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, sticker_number)
);

-- Create user_stickers table
CREATE TABLE public.user_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sticker_id UUID NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.sticker_collections(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  first_obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  obtained_from TEXT NOT NULL DEFAULT 'daily_scratch',
  UNIQUE(user_id, sticker_id)
);

-- Create daily_scratch_cards table
CREATE TABLE public.daily_scratch_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_scratched BOOLEAN NOT NULL DEFAULT false,
  scratched_at TIMESTAMP WITH TIME ZONE,
  revealed_sticker_id UUID REFERENCES public.stickers(id),
  collection_id UUID NOT NULL REFERENCES public.sticker_collections(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type TEXT NOT NULL DEFAULT 'collection_complete',
  requirements JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_id)
);

-- Add foreign key from sticker_collections to badges
ALTER TABLE public.sticker_collections 
  ADD CONSTRAINT fk_completion_badge 
  FOREIGN KEY (completion_badge_id) 
  REFERENCES public.badges(id) ON DELETE SET NULL;

-- Enable RLS on all tables
ALTER TABLE public.sticker_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_scratch_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sticker_collections
CREATE POLICY "Collections viewable by everyone" 
  ON public.sticker_collections FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage collections" 
  ON public.sticker_collections FOR ALL 
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for stickers
CREATE POLICY "Stickers viewable by everyone" 
  ON public.stickers FOR SELECT 
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM sticker_collections 
    WHERE id = stickers.collection_id AND is_active = true
  ));

CREATE POLICY "Admins can manage stickers" 
  ON public.stickers FOR ALL 
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for user_stickers
CREATE POLICY "Users can view their own stickers" 
  ON public.user_stickers FOR SELECT 
  USING (auth.uid() = user_id OR has_admin_access(auth.uid()));

CREATE POLICY "Admins can view all stickers" 
  ON public.user_stickers FOR SELECT 
  USING (has_admin_access(auth.uid()));

-- RLS Policies for daily_scratch_cards
CREATE POLICY "Users can view their own scratch cards" 
  ON public.daily_scratch_cards FOR SELECT 
  USING (auth.uid() = user_id OR has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage scratch cards" 
  ON public.daily_scratch_cards FOR ALL 
  USING (has_admin_access(auth.uid()));

-- RLS Policies for badges
CREATE POLICY "Badges viewable by everyone" 
  ON public.badges FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage badges" 
  ON public.badges FOR ALL 
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges" 
  ON public.user_badges FOR SELECT 
  USING (auth.uid() = user_id OR has_admin_access(auth.uid()));

-- Function to check collection completion
CREATE OR REPLACE FUNCTION public.check_collection_completion(_user_id UUID, _collection_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_stickers INTEGER;
  user_unique_stickers INTEGER;
  badge_id_to_award UUID;
BEGIN
  -- Get total stickers in collection
  SELECT COUNT(*) INTO total_stickers
  FROM stickers
  WHERE collection_id = _collection_id AND is_active = true;
  
  -- Get user's unique stickers in collection
  SELECT COUNT(DISTINCT sticker_id) INTO user_unique_stickers
  FROM user_stickers
  WHERE user_id = _user_id AND collection_id = _collection_id;
  
  -- Check if complete
  IF user_unique_stickers >= total_stickers AND total_stickers > 0 THEN
    -- Get badge for this collection
    SELECT completion_badge_id INTO badge_id_to_award
    FROM sticker_collections
    WHERE id = _collection_id;
    
    -- Award badge if exists and not already awarded
    IF badge_id_to_award IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id, metadata)
      VALUES (_user_id, badge_id_to_award, jsonb_build_object('collection_id', _collection_id))
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Trigger function to check completion after sticker obtained
CREATE OR REPLACE FUNCTION public.on_sticker_obtained()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_collection_completion(NEW.user_id, NEW.collection_id);
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER check_completion_on_sticker_obtained
  AFTER INSERT OR UPDATE ON public.user_stickers
  FOR EACH ROW
  EXECUTE FUNCTION on_sticker_obtained();

-- Function to generate daily scratch cards for a user
CREATE OR REPLACE FUNCTION public.generate_daily_scratch_card(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_collection_id UUID;
  card_id UUID;
  today DATE;
BEGIN
  today := CURRENT_DATE;
  
  -- Get active collection
  SELECT id INTO active_collection_id
  FROM sticker_collections
  WHERE is_active = true
    AND start_date <= today
    AND (end_date IS NULL OR end_date >= today)
  ORDER BY display_order
  LIMIT 1;
  
  -- If no active collection, return null
  IF active_collection_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create scratch card if doesn't exist for today
  INSERT INTO daily_scratch_cards (user_id, date, collection_id, expires_at)
  VALUES (
    _user_id,
    today,
    active_collection_id,
    (today + INTERVAL '1 day')::timestamp with time zone
  )
  ON CONFLICT (user_id, date) DO NOTHING
  RETURNING id INTO card_id;
  
  RETURN card_id;
END;
$$;

-- Create storage bucket for sticker images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sticker-images', 'sticker-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Sticker images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sticker-images');

CREATE POLICY "Admins can upload sticker images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sticker-images' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can update sticker images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'sticker-images' AND has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete sticker images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sticker-images' AND has_admin_access(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_stickers_collection ON stickers(collection_id);
CREATE INDEX idx_user_stickers_user ON user_stickers(user_id);
CREATE INDEX idx_user_stickers_collection ON user_stickers(collection_id);
CREATE INDEX idx_daily_scratch_cards_user_date ON daily_scratch_cards(user_id, date);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);