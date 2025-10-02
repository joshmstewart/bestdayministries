-- Add friend code fields to profiles
ALTER TABLE public.profiles
ADD COLUMN friend_code_emoji text,
ADD COLUMN friend_code_number integer,
ADD CONSTRAINT unique_friend_code UNIQUE (friend_code_emoji, friend_code_number),
ADD CONSTRAINT friend_code_number_range CHECK (friend_code_number >= 1 AND friend_code_number <= 20);