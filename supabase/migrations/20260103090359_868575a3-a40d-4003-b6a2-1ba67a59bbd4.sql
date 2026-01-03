-- Add product options and image mapping columns
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS image_option_mapping jsonb DEFAULT '{}'::jsonb;

-- options format: [{"name": "Color", "values": ["Red", "Blue", "Green"]}, {"name": "Size", "values": ["S", "M", "L"]}]
-- image_option_mapping format: {"Red": [0, 1], "Blue": [2, 3]} - maps option value to image indices

COMMENT ON COLUMN public.products.options IS 'Product options like Color, Size. Format: [{"name": "Color", "values": ["Red", "Blue"]}]';
COMMENT ON COLUMN public.products.image_option_mapping IS 'Maps option values to image indices. Format: {"Red": [0, 1], "Blue": [2, 3]}';