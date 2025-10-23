-- Add homepage_video section to homepage_sections table
INSERT INTO homepage_sections (section_key, section_name, is_visible, display_order, content)
VALUES (
  'homepage_video',
  'Homepage Video',
  false,
  6,
  '{
    "title": "Featured Video",
    "description": "",
    "video_type": "youtube",
    "youtube_url": "",
    "video_url": ""
  }'::jsonb
)
ON CONFLICT (section_key) DO NOTHING;