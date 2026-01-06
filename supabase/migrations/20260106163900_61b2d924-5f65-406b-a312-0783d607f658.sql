-- Add unique constraint for upsert to work properly
ALTER TABLE public.user_colorings 
ADD CONSTRAINT user_colorings_user_page_unique UNIQUE (user_id, coloring_page_id);