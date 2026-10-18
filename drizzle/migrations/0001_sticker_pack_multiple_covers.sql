ALTER TABLE public.sticker_collections
  ADD COLUMN pack_image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN pack_cover_mode text NOT NULL DEFAULT 'rotate' CHECK (pack_cover_mode IN ('rotate', 'choose'));
COMMENT ON COLUMN public.sticker_collections.pack_image_urls IS 'Visual pack covers; empty array falls back to pack_image_url. Does not affect sticker pulls.';
COMMENT ON COLUMN public.sticker_collections.pack_cover_mode IS 'Visual cover selection: rotate randomly without consecutive repeats, or choose manually.';