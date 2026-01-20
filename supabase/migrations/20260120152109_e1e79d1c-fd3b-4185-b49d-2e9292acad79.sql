-- Create the feed_reposts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feed_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_item_type TEXT NOT NULL,
  original_item_id UUID NOT NULL,
  reposted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reposted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS
ALTER TABLE public.feed_reposts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view reposts" ON public.feed_reposts;
DROP POLICY IF EXISTS "Admins can create reposts" ON public.feed_reposts;
DROP POLICY IF EXISTS "Admins can delete reposts" ON public.feed_reposts;

-- Everyone can view reposts
CREATE POLICY "Anyone can view reposts" ON public.feed_reposts
  FOR SELECT USING (true);

-- Only admins/owners can create reposts
CREATE POLICY "Admins can create reposts" ON public.feed_reposts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'owner')
    )
  );

-- Only admins/owners can delete reposts
CREATE POLICY "Admins can delete reposts" ON public.feed_reposts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'owner')
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_feed_reposts_item ON public.feed_reposts(original_item_type, original_item_id);
CREATE INDEX IF NOT EXISTS idx_feed_reposts_reposted_at ON public.feed_reposts(reposted_at DESC);

-- Grant permissions on table
GRANT ALL ON public.feed_reposts TO authenticated;

-- Recreate the view with repost support
DROP VIEW IF EXISTS community_feed_items;

CREATE VIEW community_feed_items AS
-- Beat Pad Creations
SELECT 
  id,
  'beat'::text AS item_type,
  name AS title,
  NULL::text AS description,
  creator_id AS author_id,
  created_at,
  image_url,
  likes_count,
  NULL::bigint AS comments_count,
  jsonb_build_object('pattern', pattern, 'tempo', tempo) AS extra_data,
  NULL::uuid AS repost_id
FROM beat_pad_creations
WHERE is_public = true

UNION ALL

-- User Colorings
SELECT 
  uc.id,
  'coloring'::text AS item_type,
  COALESCE(cp.title, 'Coloring') AS title,
  NULL::text AS description,
  uc.user_id AS author_id,
  uc.created_at,
  uc.thumbnail_url AS image_url,
  uc.likes_count,
  NULL::bigint AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM user_colorings uc
LEFT JOIN coloring_pages cp ON uc.coloring_page_id = cp.id
WHERE uc.is_public = true

UNION ALL

-- User Cards
SELECT 
  id,
  'card'::text AS item_type,
  COALESCE(title, 'Card') AS title,
  NULL::text AS description,
  user_id AS author_id,
  created_at,
  thumbnail_url AS image_url,
  likes_count,
  NULL::bigint AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM user_cards
WHERE is_public = true

UNION ALL

-- Discussion Posts
SELECT 
  dp.id,
  'post'::text AS item_type,
  dp.title,
  dp.content AS description,
  dp.author_id,
  dp.created_at,
  dp.image_url,
  0 AS likes_count,
  (SELECT count(*) FROM discussion_comments WHERE post_id = dp.id) AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM discussion_posts dp
WHERE dp.is_moderated = true

UNION ALL

-- Albums
SELECT 
  a.id,
  'album'::text AS item_type,
  a.title,
  a.description,
  a.created_by AS author_id,
  a.created_at,
  a.cover_image_url AS image_url,
  0 AS likes_count,
  (SELECT count(*) FROM album_images WHERE album_id = a.id) AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM albums a
WHERE a.is_active = true AND a.is_public = true

UNION ALL

-- Chore Challenge Gallery
SELECT 
  id,
  'chore_art'::text AS item_type,
  COALESCE(title, 'Chore Challenge Art') AS title,
  NULL::text AS description,
  user_id AS author_id,
  created_at,
  image_url,
  likes_count,
  NULL::bigint AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM chore_challenge_gallery

UNION ALL

-- Events (original)
SELECT 
  id,
  'event'::text AS item_type,
  title,
  description,
  created_by AS author_id,
  created_at,
  image_url,
  0 AS likes_count,
  NULL::bigint AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM events
WHERE is_active = true AND is_public = true

UNION ALL

-- Event Reposts (reposted events appear with new timestamp)
SELECT 
  e.id,
  'event'::text AS item_type,
  e.title,
  e.description,
  e.created_by AS author_id,
  fr.reposted_at AS created_at,
  e.image_url,
  0 AS likes_count,
  NULL::bigint AS comments_count,
  jsonb_build_object('is_repost', true, 'reposted_at', fr.reposted_at) AS extra_data,
  fr.id AS repost_id
FROM feed_reposts fr
JOIN events e ON fr.original_item_id = e.id AND fr.original_item_type = 'event'
WHERE e.is_active = true AND e.is_public = true

UNION ALL

-- Prayer Requests
SELECT 
  id,
  'prayer'::text AS item_type,
  title,
  content AS description,
  user_id AS author_id,
  created_at,
  image_url,
  likes_count,
  NULL::bigint AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM prayer_requests
WHERE is_public = true

UNION ALL

-- Workout Generated Images
SELECT 
  id,
  'workout'::text AS item_type,
  COALESCE(activity_name, 'Workout Photo') AS title,
  NULL::text AS description,
  user_id AS author_id,
  created_at,
  image_url,
  likes_count,
  NULL::bigint AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM workout_generated_images
WHERE is_shared_to_community = true

UNION ALL

-- Public Recipes
SELECT 
  id,
  'recipe'::text AS item_type,
  title,
  description,
  creator_id AS author_id,
  created_at,
  image_url,
  likes_count,
  NULL::bigint AS comments_count,
  jsonb_build_object('ingredients', ingredients, 'steps', steps) AS extra_data,
  NULL::uuid AS repost_id
FROM public_recipes
WHERE is_active = true

UNION ALL

-- Custom Drinks
SELECT 
  id,
  'drink'::text AS item_type,
  name AS title,
  description,
  creator_id AS author_id,
  created_at,
  generated_image_url AS image_url,
  likes_count,
  NULL::bigint AS comments_count,
  NULL::jsonb AS extra_data,
  NULL::uuid AS repost_id
FROM custom_drinks
WHERE is_public = true

UNION ALL

-- Saved Jokes - use updated_at for sorting (when shared)
SELECT 
  id,
  'joke'::text AS item_type,
  category AS title,
  answer AS description,
  user_id AS author_id,
  updated_at AS created_at,
  NULL::text AS image_url,
  likes_count,
  NULL::bigint AS comments_count,
  jsonb_build_object('question', question, 'answer', answer) AS extra_data,
  NULL::uuid AS repost_id
FROM saved_jokes
WHERE is_public = true

ORDER BY created_at DESC;

-- Grant permissions on view
GRANT SELECT ON public.community_feed_items TO authenticated;
GRANT SELECT ON public.community_feed_items TO anon;