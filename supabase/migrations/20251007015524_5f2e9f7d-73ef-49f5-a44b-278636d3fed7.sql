-- Add donation_form section to support_page_sections
INSERT INTO public.support_page_sections (section_key, section_name, is_visible, display_order, content)
VALUES 
  ('donation_form', 'Donation Form', true, 1, '{"title": "Support Our Mission", "description": "Make a one-time or recurring donation to support our work"}')
ON CONFLICT (section_key) DO NOTHING;

-- Update display order to put donation form first
UPDATE public.support_page_sections SET display_order = 0 WHERE section_key = 'header';
UPDATE public.support_page_sections SET display_order = 1 WHERE section_key = 'donation_form';
UPDATE public.support_page_sections SET display_order = 2 WHERE section_key = 'sponsor_bestie';
UPDATE public.support_page_sections SET display_order = 3 WHERE section_key = 'other_ways';
UPDATE public.support_page_sections SET display_order = 4 WHERE section_key = 'wishlists';
UPDATE public.support_page_sections SET display_order = 5 WHERE section_key = 'impact';