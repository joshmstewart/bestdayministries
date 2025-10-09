-- Create pet_types table for available pets
CREATE TABLE public.pet_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  image_url text,
  base_happiness integer NOT NULL DEFAULT 50,
  base_hunger integer NOT NULL DEFAULT 50,
  base_energy integer NOT NULL DEFAULT 50,
  unlock_cost integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_pets table for user's adopted pets
CREATE TABLE public.user_pets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_type_id uuid NOT NULL REFERENCES public.pet_types(id) ON DELETE CASCADE,
  pet_name text NOT NULL,
  happiness integer NOT NULL DEFAULT 50 CHECK (happiness >= 0 AND happiness <= 100),
  hunger integer NOT NULL DEFAULT 50 CHECK (hunger >= 0 AND hunger <= 100),
  energy integer NOT NULL DEFAULT 50 CHECK (energy >= 0 AND energy <= 100),
  last_fed_at timestamp with time zone,
  last_played_at timestamp with time zone,
  last_rested_at timestamp with time zone,
  last_decay_at timestamp with time zone NOT NULL DEFAULT now(),
  adopted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- Each user can only have one pet
);

-- Create indexes
CREATE INDEX idx_user_pets_user_id ON public.user_pets(user_id);
CREATE INDEX idx_pet_types_active ON public.pet_types(is_active);

-- Enable RLS
ALTER TABLE public.pet_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pet_types
CREATE POLICY "Pet types viewable by everyone"
  ON public.pet_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pet types"
  ON public.pet_types FOR ALL
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- RLS Policies for user_pets
CREATE POLICY "Users can view their own pets"
  ON public.user_pets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pets"
  ON public.user_pets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets"
  ON public.user_pets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets"
  ON public.user_pets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pets"
  ON public.user_pets FOR SELECT
  USING (has_admin_access(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_pet_types_updated_at
  BEFORE UPDATE ON public.pet_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_pets_updated_at
  BEFORE UPDATE ON public.user_pets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert starter pet types
INSERT INTO public.pet_types (name, description, unlock_cost, display_order) VALUES
  ('Cosmic Cat', 'A mystical feline companion from the stars', 0, 0),
  ('Digital Dragon', 'A tiny dragon that lives in your device', 100, 1),
  ('Pixel Pup', 'An adorable pixelated puppy', 50, 2),
  ('Code Companion', 'A friendly AI helper', 150, 3);