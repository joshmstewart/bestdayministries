-- Ensure youtube_channel section exists in about_sections table
INSERT INTO public.about_sections (section_key, section_name, display_order, is_visible, content)
VALUES (
  'youtube_channel',
  'YouTube Channel',
  3,
  true,
  '{
    "badge_text": "YouTube",
    "heading": "Subscribe to Our Channel",
    "description": "Follow our journey and stay updated with our latest videos.",
    "channel_url": "https://youtube.com/@bestdayeveraustin",
    "button_text": "Visit Our Channel"
  }'::jsonb
)
ON CONFLICT (section_key) DO NOTHING;