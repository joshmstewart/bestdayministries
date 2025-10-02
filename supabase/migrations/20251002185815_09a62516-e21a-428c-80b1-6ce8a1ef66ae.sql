-- Enable public read access to homepage sections
DROP POLICY IF EXISTS "Allow public read access to homepage sections" ON public.homepage_sections;
CREATE POLICY "Allow public read access to homepage sections"
ON public.homepage_sections
FOR SELECT
TO public
USING (true);

-- Make hero section visible
UPDATE public.homepage_sections
SET is_visible = true
WHERE section_key = 'hero';