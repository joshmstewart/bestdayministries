-- Add support_video section to support_page_sections
INSERT INTO public.support_page_sections (section_key, section_name, is_visible, display_order, content)
VALUES 
  ('support_video', 'Video Section', true, 2, '{"title": "Learn About Our Impact", "description": "", "video_type": "youtube", "video_id": null, "video_url": null, "youtube_url": null}')
ON CONFLICT (section_key) DO NOTHING;

-- Update display order to position video section after donation form
UPDATE public.support_page_sections SET display_order = 0 WHERE section_key = 'header';
UPDATE public.support_page_sections SET display_order = 1 WHERE section_key = 'donation_form';
UPDATE public.support_page_sections SET display_order = 2 WHERE section_key = 'support_video';
UPDATE public.support_page_sections SET display_order = 3 WHERE section_key = 'sponsor_bestie';
UPDATE public.support_page_sections SET display_order = 4 WHERE section_key = 'other_ways';
UPDATE public.support_page_sections SET display_order = 5 WHERE section_key = 'wishlists';
UPDATE public.support_page_sections SET display_order = 6 WHERE section_key = 'impact';