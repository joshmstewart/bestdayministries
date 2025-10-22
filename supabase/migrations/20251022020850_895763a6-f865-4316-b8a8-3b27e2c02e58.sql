-- Update the hero section button URL to point to signup instead of login
UPDATE homepage_sections 
SET content = jsonb_set(content, '{button_url}', '"/auth?signup=true"')
WHERE section_key = 'hero';