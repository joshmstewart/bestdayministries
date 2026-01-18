-- Drop the existing INSERT policy that's not working
DROP POLICY IF EXISTS "Vendors can insert their own story media" ON vendor_story_media;

-- Create a corrected INSERT policy that properly checks vendor ownership
CREATE POLICY "Vendors can insert their own story media"
ON vendor_story_media
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendors 
    WHERE vendors.id = vendor_story_media.vendor_id 
    AND vendors.user_id = auth.uid()
  )
);

-- Also fix the UPDATE policy to be consistent
DROP POLICY IF EXISTS "Vendors can update their own story media" ON vendor_story_media;

CREATE POLICY "Vendors can update their own story media"
ON vendor_story_media
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM vendors 
    WHERE vendors.id = vendor_story_media.vendor_id 
    AND vendors.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendors 
    WHERE vendors.id = vendor_story_media.vendor_id 
    AND vendors.user_id = auth.uid()
  )
);

-- Fix DELETE policy too
DROP POLICY IF EXISTS "Vendors can delete their own story media" ON vendor_story_media;

CREATE POLICY "Vendors can delete their own story media"
ON vendor_story_media
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM vendors 
    WHERE vendors.id = vendor_story_media.vendor_id 
    AND vendors.user_id = auth.uid()
  )
);