-- Add design_style column to memory_match_packs for custom aesthetic per pack
ALTER TABLE public.memory_match_packs 
ADD COLUMN design_style text DEFAULT 'Vibrant colorful 3D rendered style, playful and kid-friendly, bright saturated colors, soft shadows, white background, cute and charming aesthetic';