-- Update default design style to be adult-appropriate
ALTER TABLE public.memory_match_packs 
ALTER COLUMN design_style SET DEFAULT 'Clean modern illustration, elegant and sophisticated, warm earthy tones, simple shapes, white background, approachable but adult aesthetic, no cartoon faces or childish elements';

-- Update existing packs that have the old childish default
UPDATE public.memory_match_packs 
SET design_style = 'Clean modern illustration, elegant and sophisticated, warm earthy tones, simple shapes, white background, approachable but adult aesthetic, no cartoon faces or childish elements'
WHERE design_style LIKE '%kid-friendly%' OR design_style LIKE '%cute and charming%' OR design_style IS NULL;