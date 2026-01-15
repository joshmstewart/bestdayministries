-- Joy House Stores System
-- Stores page content settings
CREATE TABLE IF NOT EXISTS public.joy_house_stores_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Store locations table
CREATE TABLE IF NOT EXISTS public.joy_house_store_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  city text,
  state text,
  zip text,
  phone text,
  hours jsonb DEFAULT '[]'::jsonb,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Store images table
CREATE TABLE IF NOT EXISTS public.joy_house_store_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid REFERENCES public.joy_house_store_locations(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  is_hero boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.joy_house_stores_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joy_house_store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joy_house_store_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content
CREATE POLICY "Anyone can read stores content" ON public.joy_house_stores_content
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage stores content" ON public.joy_house_stores_content
  FOR ALL USING (has_admin_access(auth.uid()));

-- RLS Policies for locations
CREATE POLICY "Anyone can read active locations" ON public.joy_house_store_locations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can read all locations" ON public.joy_house_store_locations
  FOR SELECT USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage locations" ON public.joy_house_store_locations
  FOR ALL USING (has_admin_access(auth.uid()));

-- RLS Policies for images
CREATE POLICY "Anyone can read store images" ON public.joy_house_store_images
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage store images" ON public.joy_house_store_images
  FOR ALL USING (has_admin_access(auth.uid()));

-- Insert default content
INSERT INTO public.joy_house_stores_content (setting_key, setting_value) VALUES
('page_content', '{
  "hero_heading": "Joy House Stores",
  "hero_subheading": "Visit our brick-and-mortar locations where our Besties create meaningful connections every day.",
  "hero_image_url": "",
  "history_title": "Our Story",
  "history_content": "Joy House Stores began with a simple idea: create spaces where adults with disabilities can thrive through meaningful work. Each store is a testament to the power of community and the joy that comes from purposeful employment.",
  "online_store_title": "Shop Online Too!",
  "online_store_description": "Cannot make it to one of our physical locations? Visit our online store for the same great products, delivered right to your door.",
  "online_store_button_text": "Visit Online Store",
  "online_store_link": "/joyhousestore"
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;