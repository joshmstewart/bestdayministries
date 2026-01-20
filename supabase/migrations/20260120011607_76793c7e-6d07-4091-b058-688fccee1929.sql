-- Create a unified view for the community feed
-- This combines all public content types into a single queryable view

CREATE OR REPLACE VIEW public.community_feed_items AS

-- Beat Pad Creations
SELECT 
  id,
  'beat'::text as item_type,
  name as title,
  NULL::text as description,
  creator_id as author_id,
  created_at,
  image_url,
  likes_count,
  NULL::integer as comments_count
FROM beat_pad_creations 
WHERE is_public = true

UNION ALL

-- User Cards
SELECT 
  id,
  'card'::text as item_type,
  COALESCE(title, 'Greeting Card') as title,
  NULL::text as description,
  user_id as author_id,
  created_at,
  thumbnail_url as image_url,
  likes_count,
  NULL::integer as comments_count
FROM user_cards 
WHERE is_public = true

UNION ALL

-- User Colorings
SELECT 
  id,
  'coloring'::text as item_type,
  'Coloring Creation'::text as title,
  NULL::text as description,
  user_id as author_id,
  created_at,
  thumbnail_url as image_url,
  likes_count,
  NULL::integer as comments_count
FROM user_colorings 
WHERE is_public = true

UNION ALL

-- Discussion Posts (moderated ones)
SELECT 
  id,
  'post'::text as item_type,
  title,
  content as description,
  author_id,
  created_at,
  image_url,
  0 as likes_count,
  (SELECT COUNT(*)::integer FROM discussion_comments WHERE post_id = discussion_posts.id) as comments_count
FROM discussion_posts 
WHERE is_moderated = true

UNION ALL

-- Albums (public ones)
SELECT 
  id,
  'album'::text as item_type,
  title,
  description,
  created_by as author_id,
  created_at,
  cover_image_url as image_url,
  0 as likes_count,
  NULL::integer as comments_count
FROM albums 
WHERE is_public = true AND is_active = true

UNION ALL

-- Chore Challenge Gallery
SELECT 
  id,
  'chore_art'::text as item_type,
  COALESCE(title, 'Chore Challenge Art') as title,
  NULL::text as description,
  user_id as author_id,
  created_at,
  image_url,
  likes_count,
  NULL::integer as comments_count
FROM chore_challenge_gallery;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.community_feed_items TO authenticated;
GRANT SELECT ON public.community_feed_items TO anon;

-- Insert a new community section for the feed
INSERT INTO community_sections (section_key, section_name, display_order, is_visible, content)
VALUES (
  'newsfeed',
  'What''s New',
  0,
  true,
  '{"title": "What''s New", "subtitle": "See the latest creations from our community"}'::jsonb
)
ON CONFLICT (section_key) DO UPDATE SET
  is_visible = true,
  display_order = 0;