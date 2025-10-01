-- Add audio and post capabilities to albums
ALTER TABLE public.albums 
ADD COLUMN audio_url TEXT,
ADD COLUMN is_post BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.albums.audio_url IS 'Audio voiceover for the album description';
COMMENT ON COLUMN public.albums.is_post IS 'Whether this album should be displayed as a post';