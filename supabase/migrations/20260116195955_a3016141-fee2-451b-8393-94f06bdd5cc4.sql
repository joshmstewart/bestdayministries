-- Create workout location packs table (purchasable bundles like "Hawaii")
CREATE TABLE public.workout_location_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_coins INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout locations table (individual places within packs)
CREATE TABLE public.workout_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID REFERENCES public.workout_location_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user purchased packs table
CREATE TABLE public.user_workout_location_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.workout_location_packs(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

-- Enable RLS
ALTER TABLE public.workout_location_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_location_packs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workout_location_packs
CREATE POLICY "Anyone can view active location packs"
  ON public.workout_location_packs
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage location packs"
  ON public.workout_location_packs
  FOR ALL
  USING (public.has_admin_access(auth.uid()));

-- RLS policies for workout_locations
CREATE POLICY "Anyone can view active locations"
  ON public.workout_locations
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage locations"
  ON public.workout_locations
  FOR ALL
  USING (public.has_admin_access(auth.uid()));

-- RLS policies for user_workout_location_packs
CREATE POLICY "Users can view their own purchased packs"
  ON public.user_workout_location_packs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase packs"
  ON public.user_workout_location_packs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchased packs"
  ON public.user_workout_location_packs
  FOR SELECT
  USING (public.has_admin_access(auth.uid()));

-- Create indexes
CREATE INDEX idx_workout_locations_pack_id ON public.workout_locations(pack_id);
CREATE INDEX idx_user_workout_location_packs_user_id ON public.user_workout_location_packs(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_workout_location_packs_updated_at
  BEFORE UPDATE ON public.workout_location_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_locations_updated_at
  BEFORE UPDATE ON public.workout_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();