-- Update the about_content section to remove the placeholder note
UPDATE public.about_sections 
SET content = '{}'::jsonb
WHERE section_key = 'about_content';