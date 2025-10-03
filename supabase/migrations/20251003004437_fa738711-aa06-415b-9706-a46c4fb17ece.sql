-- Add featured items section to homepage_sections
INSERT INTO public.homepage_sections (section_key, section_name, display_order, is_visible, content)
VALUES (
  'featured_items',
  'Featured Items',
  2,
  true,
  '{}'::jsonb
)
ON CONFLICT (section_key) DO NOTHING;

-- Update display order for other sections to make room (shift everything down by 1)
UPDATE public.homepage_sections
SET display_order = display_order + 1
WHERE section_key != 'featured_items' AND display_order >= 2;