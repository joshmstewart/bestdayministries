-- Add content field to homepage_sections table to store editable content
ALTER TABLE public.homepage_sections 
ADD COLUMN content JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the content structure
COMMENT ON COLUMN public.homepage_sections.content IS 'Stores section-specific content like titles, descriptions, images, etc. Structure varies by section_key';

-- Update existing rows with default content based on section_key
UPDATE public.homepage_sections
SET content = CASE 
  WHEN section_key = 'hero' THEN jsonb_build_object(
    'title', 'Building Community Through Creativity',
    'subtitle', 'Empowering individuals with special needs through art, friendship, and belonging',
    'image_url', '/src/assets/hero-hands.jpg',
    'cta_primary_text', 'Join Our Community',
    'cta_secondary_text', 'Learn More'
  )
  WHEN section_key = 'mission' THEN jsonb_build_object(
    'title', 'Our Mission',
    'content', 'We believe everyone deserves a community where they belong. Through creative expression and meaningful connections, we empower individuals with special needs to discover their unique gifts and share them with the world.'
  )
  WHEN section_key = 'featured_bestie' THEN jsonb_build_object(
    'title', 'Featured Community Member'
  )
  WHEN section_key = 'community_features' THEN jsonb_build_object(
    'title', 'Join Our Community',
    'subtitle', 'Connect, create, and celebrate together'
  )
  WHEN section_key = 'community_gallery' THEN jsonb_build_object(
    'title', 'Our Community in Action',
    'subtitle', 'Celebrating moments of joy, creativity, and connection'
  )
  WHEN section_key = 'latest_album' THEN jsonb_build_object(
    'title', 'Latest Memories'
  )
  ELSE '{}'::jsonb
END
WHERE content = '{}'::jsonb;