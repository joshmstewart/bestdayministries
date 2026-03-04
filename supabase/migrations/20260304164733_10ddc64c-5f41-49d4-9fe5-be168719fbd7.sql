
CREATE TABLE public.wordle_valid_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT wordle_valid_words_word_unique UNIQUE (word),
  CONSTRAINT wordle_valid_words_word_length CHECK (char_length(word) = 5),
  CONSTRAINT wordle_valid_words_word_alpha CHECK (word ~ '^[A-Z]+$')
);

ALTER TABLE public.wordle_valid_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read valid words"
  ON public.wordle_valid_words
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage valid words"
  ON public.wordle_valid_words
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner())
  WITH CHECK (public.is_admin_or_owner());
