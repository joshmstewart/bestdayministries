-- Create storage bucket for game assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-assets', 'game-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY "Public read access for game assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'game-assets');

-- Create storage policy for admin upload access
CREATE POLICY "Admins can upload game assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'game-assets' 
  AND (
    public.get_user_role(auth.uid()) = 'admin'::public.user_role 
    OR public.get_user_role(auth.uid()) = 'owner'::public.user_role
  )
);

-- Create storage policy for admin update access
CREATE POLICY "Admins can update game assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'game-assets' 
  AND (
    public.get_user_role(auth.uid()) = 'admin'::public.user_role 
    OR public.get_user_role(auth.uid()) = 'owner'::public.user_role
  )
);

-- Create storage policy for admin delete access
CREATE POLICY "Admins can delete game assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'game-assets' 
  AND (
    public.get_user_role(auth.uid()) = 'admin'::public.user_role 
    OR public.get_user_role(auth.uid()) = 'owner'::public.user_role
  )
);