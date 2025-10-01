-- Add audio support to discussion comments
ALTER TABLE public.discussion_comments 
ADD COLUMN audio_url TEXT;

COMMENT ON COLUMN public.discussion_comments.audio_url IS 'Audio recording URL for audio-only comments';