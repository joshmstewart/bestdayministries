-- Create coloring_books table
CREATE TABLE public.coloring_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT NOT NULL,
  coin_price INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add book_id to coloring_pages
ALTER TABLE public.coloring_pages 
ADD COLUMN book_id UUID REFERENCES public.coloring_books(id) ON DELETE SET NULL;

-- Create user_coloring_books to track purchases
CREATE TABLE public.user_coloring_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.coloring_books(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  coins_spent INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.coloring_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coloring_books ENABLE ROW LEVEL SECURITY;

-- RLS for coloring_books: anyone can view active books
CREATE POLICY "Anyone can view active coloring books"
ON public.coloring_books FOR SELECT
USING (is_active = true);

-- Admins can manage all books
CREATE POLICY "Admins can manage coloring books"
ON public.coloring_books FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- RLS for user_coloring_books: users see their own purchases
CREATE POLICY "Users can view their own book purchases"
ON public.user_coloring_books FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase books"
ON public.user_coloring_books FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create a default "Loose Pages" book for existing pages
INSERT INTO public.coloring_books (title, description, cover_image_url, is_free, display_order)
VALUES ('Free Pages', 'A collection of free coloring pages for everyone!', 'https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/app-assets/coloring-pages/free-book-cover.png', true, 0);

-- Update existing pages to belong to the free book
UPDATE public.coloring_pages 
SET book_id = (SELECT id FROM public.coloring_books WHERE title = 'Free Pages' LIMIT 1)
WHERE book_id IS NULL;