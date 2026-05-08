UPDATE public.sticker_collections
SET name = 'Spring 2026',
    description = 'Blossoming flowers, baby animals, rainbows, and all the joys of spring.',
    theme = 'spring',
    start_date = '2026-03-01',
    end_date = '2026-05-31',
    is_active = false,
    visible_to_roles = ARRAY['supporter','bestie','caregiver','admin','owner']::user_role[],
    stickers_per_pack = 2,
    use_default_rarity = true,
    rarity_percentages = '{"common":30,"uncommon":25,"rare":20,"epic":15,"legendary":10}'::jsonb
WHERE id = '11517ed1-8a43-47fc-ab66-9511f169c8f3';

INSERT INTO public.sticker_collections
  (name, description, theme, start_date, end_date, is_active, visible_to_roles, stickers_per_pack, use_default_rarity, rarity_percentages, display_order)
VALUES
  ('Summer 2026',
   'Sunshine, beach days, popsicles, fireworks, and all the warmth of summer.',
   'summer',
   '2026-06-01',
   '2026-08-31',
   false,
   ARRAY['supporter','bestie','caregiver','admin','owner']::user_role[],
   2,
   true,
   '{"common":30,"uncommon":25,"rare":20,"epic":15,"legendary":10}'::jsonb,
   0);