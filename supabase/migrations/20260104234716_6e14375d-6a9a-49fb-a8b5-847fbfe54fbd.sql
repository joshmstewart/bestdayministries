-- Create memory match image packs table
CREATE TABLE public.memory_match_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  price_coins INTEGER DEFAULT 0,
  store_item_id UUID REFERENCES public.store_items(id),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory match images table
CREATE TABLE public.memory_match_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.memory_match_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user owned packs table (for non-default packs)
CREATE TABLE public.user_memory_match_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.memory_match_packs(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

-- Enable RLS
ALTER TABLE public.memory_match_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_match_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory_match_packs ENABLE ROW LEVEL SECURITY;

-- Policies for packs (everyone can view active packs)
CREATE POLICY "Anyone can view active packs" 
ON public.memory_match_packs 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage packs" 
ON public.memory_match_packs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Policies for images (everyone can view images of active packs)
CREATE POLICY "Anyone can view images of active packs" 
ON public.memory_match_images 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.memory_match_packs 
    WHERE id = pack_id AND is_active = true
  )
);

CREATE POLICY "Admins can manage images" 
ON public.memory_match_images 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Policies for user owned packs
CREATE POLICY "Users can view their own packs" 
ON public.user_memory_match_packs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase packs" 
ON public.user_memory_match_packs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_memory_match_packs_updated_at
BEFORE UPDATE ON public.memory_match_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default pack
INSERT INTO public.memory_match_packs (name, description, is_default, is_active, price_coins, display_order)
VALUES ('Coffee Shop', 'Classic coffee-themed memory cards', true, true, 0, 0);