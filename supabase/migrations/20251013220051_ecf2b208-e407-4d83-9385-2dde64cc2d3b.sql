-- Make the featured-bestie-images bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'featured-bestie-images';