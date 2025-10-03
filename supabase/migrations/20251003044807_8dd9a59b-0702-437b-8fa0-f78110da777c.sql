-- Add text_sections column to sponsor_besties table for flexible multi-section content
ALTER TABLE public.sponsor_besties
ADD COLUMN text_sections JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sponsor_besties.text_sections IS 'Array of text sections with type (heading/text), content, font, and color';

-- Migrate existing data to new format
UPDATE public.sponsor_besties
SET text_sections = jsonb_build_array(
  jsonb_build_object(
    'type', 'heading',
    'content', bestie_name,
    'font', heading_font,
    'color', heading_color
  ),
  jsonb_build_object(
    'type', 'text',
    'content', description,
    'font', body_font,
    'color', body_color
  )
)
WHERE text_sections = '[]'::jsonb;