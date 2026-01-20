
-- Update the community_feed_items view to include more content types
-- Adding: events, prayer_requests, workout photos, recipes, drinks, jokes

DROP VIEW IF EXISTS public.community_feed_items;

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
FROM chore_challenge_gallery

UNION ALL

-- Events (public and active)
SELECT 
  id,
  'event'::text as item_type,
  title,
  description,
  created_by as author_id,
  created_at,
  image_url,
  0 as likes_count,
  NULL::integer as comments_count
FROM events 
WHERE is_public = true AND is_active = true

UNION ALL

-- Prayer Requests (public, not answered)
SELECT 
  id,
  'prayer'::text as item_type,
  title,
  content as description,
  user_id as author_id,
  created_at,
  NULL::text as image_url,
  0 as likes_count,
  NULL::integer as comments_count
FROM prayer_requests 
WHERE is_public = true AND is_answered = false

UNION ALL

-- Workout Generated Images (shared to community)
SELECT 
  id,
  'workout'::text as item_type,
  COALESCE(activity_name, 'Workout Photo') as title,
  location_name as description,
  user_id as author_id,
  created_at,
  image_url,
  likes_count,
  NULL::integer as comments_count
FROM workout_generated_images 
WHERE is_shared_to_community = true AND is_test = false

UNION ALL

-- Public Recipes
SELECT 
  id,
  'recipe'::text as item_type,
  title,
  description,
  creator_id as author_id,
  created_at,
  image_url,
  likes_count,
  saves_count as comments_count
FROM public_recipes 
WHERE is_active = true

UNION ALL

-- Custom Drinks (public)
SELECT 
  id,
  'drink'::text as item_type,
  name as title,
  description,
  creator_id as author_id,
  created_at,
  generated_image_url as image_url,
  likes_count,
  NULL::integer as comments_count
FROM custom_drinks 
WHERE is_public = true

UNION ALL

-- Saved Jokes (public/shared)
SELECT 
  id,
  'joke'::text as item_type,
  question as title,
  answer as description,
  user_id as author_id,
  created_at,
  NULL::text as image_url,
  likes_count,
  NULL::integer as comments_count
FROM saved_jokes 
WHERE is_public = true;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.community_feed_items TO authenticated;
GRANT SELECT ON public.community_feed_items TO anon;
